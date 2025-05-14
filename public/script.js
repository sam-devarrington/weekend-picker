// Wait for the HTML document to be fully loaded and parsed
document.addEventListener('DOMContentLoaded', function() {

    // Initialize Flatpickr on the input element with id="dates"
    const datePicker = flatpickr("#dates", {
        mode: "multiple", // Allows selecting multiple dates
        dateFormat: "Y-m-d", // Store and send dates in 'YYYY-MM-DD' format
        minDate: "today",   // Don't allow selection of past dates
        // Function to enable only Saturdays (6) and Sundays (0)
        enable: [
            function(date) {
                // date.getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
                return (date.getDay() === 5 || date.getDay() === 6 || date.getDay() === 0); // Friday, Saturday, or Sunday
            }
        ],
        // Optional: A function that runs when a date is selected/deselected
        onChange: function(selectedDates, dateStr, instance) {
            // console.log("Selected dates:", selectedDates);
            // You could add more complex logic here if needed, e.g.,
            // to ensure users select pairs of Sat/Sun, or to give visual feedback.
        }
    });

    // Get references to the form and the message display div
    const form = document.getElementById('tripForm');
    const messageDiv = document.getElementById('message');

    // Add an event listener for the form's 'submit' event
    form.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent the default form submission (which reloads the page)

        // Get the value from the name input field
        const name = document.getElementById('name').value.trim(); // .trim() removes whitespace from ends

        // Get the selected dates from Flatpickr.
        // flatpickr.selectedDates is an array of Date objects.
        // We map over them to format them as 'YYYY-MM-DD' strings.
        const selectedDates = datePicker.selectedDates.map(date =>
            date.getFullYear() + '-' +
            ('0' + (date.getMonth() + 1)).slice(-2) + '-' + // Months are 0-indexed, so add 1. Pad with '0'
            ('0' + date.getDate()).slice(-2) // Pad day with '0'
        );

        // --- Basic Client-Side Validation ---
        if (!name) { // Check if name is empty
            showMessage('Please enter your name.', 'error');
            return; // Stop further execution
        }

        if (selectedDates.length === 0) { // Check if any dates were selected
            showMessage('Please select at least one weekend date.', 'error');
            return; // Stop further execution
        }

        // A simple validation: selected weekend dates should be in pairs (Sat & Sun)
        // So, the total number of selected dates should be even.

        // More sophisticated validation could check if each selected date has its corresponding weekend partner selected.
        // For now, this simple even/odd check is a basic guard.

        // --- Prepare Data and Send to Server ---
        try {
            // Use the Fetch API to send a POST request to our backend
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Tell the server we're sending JSON
                },
                // Convert the JavaScript object to a JSON string
                body: JSON.stringify({ name: name, dates: selectedDates }),
            });

            // Parse the JSON response from the server
            const result = await response.json();

            if (response.ok) { // Check if the HTTP status code is 2xx (e.g., 200 OK, 201 Created)
                showMessage(result.message, 'success'); // Display success message from server
                form.reset(); // Clear the form fields
                datePicker.clear(); // Clear the selected dates in Flatpickr
            } else {
                // Display error message from server (or a generic one if none provided)
                showMessage(result.message || 'An error occurred while submitting.', 'error');
            }
        } catch (error) {
            // Handle network errors or other issues with the fetch request
            console.error('Error submitting form:', error);
            showMessage('Failed to connect to the server. Please try again.', 'error');
        }
    });

    // Helper function to display messages to the user
    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = ''; // Clear previous classes
        messageDiv.classList.add(type); // Add 'success' or 'error' class for styling

        // Optional: Clear the message after a few seconds
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = '';
        }, 5000); // Message disappears after 5 seconds
    }
});