function toggleInputFields() {
  const mediaType = document.querySelector('[name="media_type"]').value;
  document.getElementById('original-link-field').style.display = mediaType === 'links' ? 'block' : 'none';
  document.getElementById('text-area-field').style.display = mediaType === 'text' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', toggleInputFields);
