module.exports = {
    format: 'A4', // Corrected property name from 'formate' to 'format'
    orientation: 'landscape',
    footer: {
        height: "0mm",
        contents: {
            first: 'Cover page',
            2: 'Second page', // Any page number is working. 1-based index
            default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
            last: 'Last Page'
        }
    },
    css: '{ page-break-inside: avoid; }' // Corrected placement of CSS style declaration
};