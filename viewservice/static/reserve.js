document.addEventListener('DOMContentLoaded', function () {
  var slotSelect = document.getElementById('slotId');
  var vehicleTypeInput = document.getElementById('vehicleType');

  if (!slotSelect || !vehicleTypeInput) {
    return; // not on this page
  }

  function updateVehicleTypeFromSlot() {
    var option = slotSelect.options[slotSelect.selectedIndex];
    if (!option || !option.value) {
      vehicleTypeInput.value = '';
      return;
    }

    var type = option.getAttribute('data-type') || '';

    // normalize capitalization just in case
    var lower = type.toLowerCase();
    if (lower === 'car')        type = 'Car';
    else if (lower === 'motorcycle') type = 'Motorcycle';

    vehicleTypeInput.value = type;
  }

  // When user changes slot
  slotSelect.addEventListener('change', updateVehicleTypeFromSlot);

  // On initial load:
  // - if EJS already set initialVehicleType, we keep it
  // - if it's empty, we compute it from selected option
  if (!vehicleTypeInput.value) {
    updateVehicleTypeFromSlot();
  }
});
