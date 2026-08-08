// helper function to calculate age dynamically from DOB
const calculateAge = (dob) => {
    if (!dob) {
        return null;
    }

    const today = new Date();
    const birthDate = new Date(dob);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const balancedMonth = today.getMonth() - birthDate.getMonth();
    if (balancedMonth < 0 || (balancedMonth === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
    }
    return calculatedAge;
}

module.exports = { calculateAge };