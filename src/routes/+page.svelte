<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	let socket: WebSocket;
	let messages = writable<Array<{ text: string; sender: 'user' | 'stranger' }>>([]);
	let inputMessage = '';
	let connectionStatus = 'Connecting...';
	let isConnected = false;
	let isReally = false; // New state to track if confirmation is needed for stopping
	let isServerConnected = false;

	onMount(() => {
		connectToServer();
	});
 
	function connectToServer() {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const host = import.meta.env.VITE_API_URL || window.location.hostname; // Adjust as needed
		const port = import.meta.env.VITE_API_PORT || '8080'; // Use your backend port
		const path = import.meta.env.DEV ? '/socket' : '';
		// console.log("bint", protocol, `${host}:${port}`, path);
		socket = new WebSocket(`${protocol}//${host}:${port}${path}`);


		socket.onmessage = (event) => {
			if (typeof event.data === 'string') {
				handleMessage(event.data);
			} else if (event.data instanceof Blob) {
				const reader = new FileReader();
				reader.onload = () => {
					if (typeof reader.result === 'string') {
						handleMessage(reader.result);
					}
				};
				reader.onerror = () => {
					console.error('Error reading Blob as text');
				};
				reader.readAsText(event.data);
			} else {
				console.error('Unsupported message format');
			}
		};

		function handleMessage(data: string) {
			try {
				const parsedData = JSON.parse(data);
				if (parsedData.type === 'message') {
					messages.update((msgs) => [...msgs, { text: parsedData.text, sender: 'stranger' }]);
				} else if (parsedData.type === 'status') {
					connectionStatus = parsedData.text;
					if (parsedData.text === 'Disconnected') {
						isConnected = false;
            isReally = false;
            isServerConnected = false;
            socket.close();
					} else if (parsedData.text === 'Connected') {
						connectionStatus = 'Connected';
						isConnected = true;
					}
				}
			} catch (error) {
				console.error('Error parsing JSON:', error);
			}
		}

		socket.onopen = () => {
			isServerConnected = true;
		};

		socket.onclose = () => {
			isServerConnected = false;
			connectionStatus = 'Disconnected';
			isConnected = false;
		};
	}

	function sendMessage() {
		if (inputMessage.trim() && isConnected) {
			socket.send(JSON.stringify({ type: 'message', text: inputMessage }));
			messages.update((msgs) => [...msgs, { text: inputMessage, sender: 'user' }]);
			inputMessage = '';
		}
	}

	function toggleConnection() {
		if (isConnected) {
			if (isReally) {
				if (socket) {
					socket.close();
				}
			} else {
				isReally = true;
				console.log('Really?');
			}
		} else {
			isReally = false;
			connectionStatus = 'Connecting...';
			disconnectAndFindNew();
		}
	}

	function disconnectAndFindNew() {
		if (socket) {
			socket.close();
		}
		messages.set([]);
		connectToServer();
		// connectionStatus = 'Connected';
		// isConnected = true; // Reset confirmation state after action
	}
</script>

<div class="min-h-screen bg-gray-100 flex flex-col">
	<div class="flex-1 p-4 flex flex-col">
		<div class="bg-white shadow-md rounded-lg p-4 mb-4">
			<h2 class="text-xl font-bold mb-2">Anonymous Chat</h2>
			<div
				class={`h-2 w-2 rounded-full ${isServerConnected ? 'bg-green-500' : 'bg-gray-500'}`}
			></div>
			<p class="text-gray-600">{connectionStatus}</p>
		</div>
		<div class="flex-1 bg-white shadow-md rounded-lg p-4 mb-4 overflow-y-auto">
			{#each $messages as message}
				<div class={`mb-2 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
					<span
						class={`inline-block p-2 rounded-lg ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
					>
						{message.text}
					</span>
				</div>
			{/each}
		</div>
		<div class="bg-white shadow-md rounded-lg p-4">
			<div class="flex">
				<input
					type="text"
					bind:value={inputMessage}
					on:keypress={(e) => e.key === 'Enter' && sendMessage()}
					placeholder="Type a message..."
					class="flex-1 border rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					disabled={!isConnected}
				/>
				<button
					on:click={sendMessage}
					class="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
					disabled={!isConnected}
				>
					Send
				</button>
			</div>
			<button
				on:click={toggleConnection}
				class="mt-4 w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
			>
				{isConnected ? (isReally ? 'Really?' : 'Stop') : 'Find New Chat'}
			</button>
		</div>
	</div>
</div>
