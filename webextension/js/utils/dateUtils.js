const dateUtils = {
    "monthNames": {
        "fr": ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
        "en": ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    "monthNames2": {
        "fr": ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
        "en": ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    },

    /**
     *
     * @param {string} dateString
     * @param {string} formatString
     * @param {'fr'|'en'} [language]
     * @returns {Date|null}
     */
    parse(dateString, formatString, language='en') {
        const monthMap = Object.fromEntries(this.monthNames[language].map((name, i) => [name, i]));
        const monthMap2 = Object.fromEntries(this.monthNames2[language].map((name, i) => [name, i]));

        const formatMap = {
            'MM': '(?<month>\\d{1,2})', // Month as MM
            'MMM': '(?<month>[A-Za-z]{3})', // Month as MMM
            'MMMM': '(?<month>[A-Za-z]+?)', // Month as MMMM
            'DD': '(?<day>\\d{1,2})', // Day as DD
            'D': '(?<day>\\d{1,2})', // Day as D
            'YYYY': '(?<year>\\d{4})', // Year as YYYY
            'YY': '(?<year>20\\d{2})', // Year as YY
            'HH': '(?<hour>\\d{1,2})', // Hour as HH
            'mm': '(?<minute>\\d{1,2})', // Minute as mm
            'ss': '(?<second>\\d{1,2})', // Second as ss
            'SSS': '(?<millisecond>\\d{1,3})', // Millisecond as SSS
        };

        const replacer = (_, before, p1, after) => {
            if (before === '[' && after === ']') return p1;
            return (before ?? '') + formatMap[p1] + (after ?? '');
        };
        const regex = new RegExp(
            '^' +
            formatString
                .replace(/(.)?(MMMM|YYYY)(.)?/g, replacer)
                .replace(/(.)?(MMM)(.)?/g, replacer)
                .replace(/(.)?(MM|DD|D|YY|HH|mm|ss|SSS)(.)?/g, replacer)
            + '$'
        );

        const match = dateString.match(regex);
        if (match && match.groups) {
            const {
                year = 0,
                month,
                day = 1,
                hour = 0,
                minute = 0,
                second = 0,
                millisecond = 0,
            } = match.groups;

            let monthValue;
            if (month && !isNaN(month)) {
                monthValue = parseInt(month) - 1;
            } else if (month && typeof month === 'string') {
                monthValue = monthMap[month] ?? monthMap2[month];
            }

            const date = new Date(year, monthValue, day, hour, minute, second, millisecond);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        return null;
    },

    /**
     *
     * @param {Date} date
     * @param {string} formatString
     * @param {'fr'|'en'} [language]
     * @returns {string}
     */
    format(date, formatString, language='en') {
        const year = date.getFullYear(),
            month = date.getMonth() + 1,
            day = date.getDate(),
            hour = date.getHours(),
            minute = date.getMinutes(),
            second = date.getSeconds(),
            millisecond = date.getMilliseconds();

        const formatMap = {
            'MM': month.toString().padStart(2, '0'), // Month as MM
            'MMM': this.monthNames[language][month], // Month as MMM
            'MMMM': this.monthNames2[language][month], // Month as MMMM
            'DD': day.toString().padStart(2, '0'), // Day as DD
            'YYYY': year, // Year as YYYY
            'YY': year.toString().slice(2), // Year as YY
            'HH': hour.toString().padStart(2, '0'), // Hour as HH
            'mm': minute.toString().padStart(2, '0'), // Minute as mm
            'ss': second.toString().padStart(2, '0'), // Second as ss
            'SSS': millisecond.toString().padStart(3, '0'), // Millisecond as SSS
        };
        const replacer = (match, before, p1, after) => {
            if (before === '[' && after === ']') return match;
            return (before ?? '') + formatMap[p1] + (after ?? '');
        };
        return formatString
            .replace(/(.)?(MMMM|YYYY)(.)?/g, replacer)
            .replace(/(.)?(MMM)(.)?/g, replacer)
            .replace(/(.)?(MMMM|MMM|MM|DD|YYYY|YY|HH|mm|ss|SSS)(.)?/g, replacer)
            .replace(/\[([^\]]+)\]/g, '$1');
    },
};
export default dateUtils;
