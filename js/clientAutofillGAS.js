function searchClients(query) {
    var apiEndpoint = 'https://api.example.com/clients'; // Replace with your actual API endpoint
    var response = UrlFetchApp.fetch(apiEndpoint + '?search=' + encodeURIComponent(query));
    return JSON.parse(response.getContentText());
}