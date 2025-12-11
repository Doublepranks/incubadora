/**
 * Formats a date string to DD-MM-AA format (e.g., 25-12-24).
 * @param {string|Date} dateValue - The date to format.
 * @returns {string} - The formatted date string or '-' if invalid.
 */
export const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return '-';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = String(date.getFullYear()).slice(-2); // Last 2 digits

        return `${day}-${month}-${year}`;
    } catch (error) {
        console.error("Error formatting date:", error);
        return '-';
    }
};
