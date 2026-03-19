// Client Autofill Implementation

// Sample client data
const clients = [
    { id: 1, name: 'Client A' },
    { id: 2, name: 'Client B' },
    { id: 3, name: 'Client C' },
    // Add more client entries as needed
];

// Debounce function to limit the rate of calls to the search function
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func.apply(null, args);
        }, delay);
    };
}

// Function to search for clients
function searchClients(query) {
    const results = clients.filter(client =>
        client.name.toLowerCase().includes(query.toLowerCase())
    );
    showResults(results);
}

// Function to display results in a dropdown UI
function showResults(results) {
    const dropdown = document.getElementById('client-dropdown');
    dropdown.innerHTML = ''; // Clear previous results

    results.forEach(client => {
        const option = document.createElement('div');
        option.textContent = client.name;
        option.onclick = function() {
            selectClient(client);
        };
        dropdown.appendChild(option);
    });

    dropdown.style.display = results.length ? 'block' : 'none';
}

// Function to handle client selection
function selectClient(client) {
    // Logic to integrate selected client with the invoice system
    console.log('Selected Client:', client);
    document.getElementById('client-input').value = client.name; // Example input field update
    document.getElementById('client-dropdown').style.display = 'none'; // Hide dropdown
}

// Setup event listeners for client input
document.getElementById('client-input').addEventListener('input', debounce(function() {
    const query = this.value;
    if (query) {
        searchClients(query);
    } else {
        showResults([]); // Hide dropdown if query is empty
    }
}, 300));

// Example HTML structure for dropdown (should be in your HTML file)
// <input id="client-input" type="text" placeholder="Search client...">
// <div id="client-dropdown" style="display:none;"></div>
