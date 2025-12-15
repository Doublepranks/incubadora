/**
 * Formats a date string to DD-MM-AA format (e.g., 25-12-24).
 * @param {string|Date} dateValue - The date to format.
 * @returns {string} - The formatted date string or '-' if invalid.
 */
export const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    try {
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
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

/**
 * Formats a "calendar date" (YYYY-MM-DD or ISO datetime) to DD-MM-AA without timezone shifting.
 * Useful for daily metrics where the time component is irrelevant.
 */
export const formatDateOnly = (dateValue) => {
    if (!dateValue) return '-';
    try {
        const raw = dateValue instanceof Date ? dateValue.toISOString() : String(dateValue);
        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return formatDate(dateValue);

        const yearNum = Number(match[1]);
        const monthNum = Number(match[2]);
        const dayNum = Number(match[3]);
        if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum) || !Number.isFinite(dayNum)) return '-';

        const date = new Date(yearNum, monthNum - 1, dayNum);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
    } catch (error) {
        console.error("Error formatting date:", error);
        return '-';
    }
};
