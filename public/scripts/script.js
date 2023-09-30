function toggleInputFields() {
  const mediaType = document.querySelector('[name="media_type"]').value;
  document.getElementById('original-link-field').style.display = mediaType === 'links' ? 'block' : 'none';
  document.getElementById('text-area-field').style.display = mediaType === 'text' ? 'block' : 'none';
  document.getElementById('custom-url-field').style.display = mediaType === 'links' ? 'block' : 'none';
}

// Call the function on page load to set the initial state
window.onload = toggleInputFields;


function openModal() {
  document.getElementById('errorModal').classList.add('is-active');
}

function closeModal() {
  document.getElementById('errorModal').classList.remove('is-active');
}

document.addEventListener('DOMContentLoaded', function () {
  var errorElement = document.getElementById('error-data');
  var error = errorElement.getAttribute('data-error');
  if (error) {
      openModal();
  }
});

document.addEventListener('DOMContentLoaded', function () {
  var error = new URLSearchParams(window.location.search).get('error');
  if (error) {
      // Assuming your modal has an id of 'errorModal'
      var errorModal = document.getElementById('errorModal');
      errorModal.classList.add('is-active');

      // Update the modal content with the error message
      var modalContent = errorModal.querySelector('.modal-card-body');
      modalContent.textContent = decodeURIComponent(error);
  }
});
