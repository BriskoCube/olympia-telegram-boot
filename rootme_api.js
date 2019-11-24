const fetch = require("node-fetch");
const parser = require('node-html-parser');

function getHighlights(html){
    const highlights = html.querySelectorAll("div.small-3.columns.text-center h3");

    const rank = highlights[0].childNodes[1].rawText.replace( /\D+/g, '');
    const score = highlights[1].childNodes[1].rawText.replace( /\D+/g, '');
    const challenges = highlights[2].childNodes[1].rawText.replace( /\D+/g, '');

    return {
        score,
        rank,
        challenges
    };
}

module.exports = {
    scoreRegex: /<span class="color1 txxl">\s+(\d+)&nbsp;Points&nbsp;\s+<span/i,

    /**
     * Get profile for a single user
     * @param username
     * @param username
     * @returns {Promise<{score, challenges, realUsername: *, rank, username: *}|null>}
     */
    user: async function (username) {
        try {
            const response = await this.safeFetch(`https://root-me.org/${username}?inc=score&lang=fr`);
            const html = parser.parse(await response.text());

            const realUsername = html.querySelector("span.forum")
                .childNodes[0].rawText;

            const highlights = getHighlights(html);

            const user = {
                ...highlights, username, realUsername
            };

            console.log(user);

            return user;
        } catch (e) {
            console.log("Exception!!!!", e);
            return null;
        }
    },


    safeFetch: async function (url) {
        let response = await fetch(url);

        let timeOut = 1000 + Math.floor((Math.random() * 1000));

        // If request rejected for too many requests. Retry after in little time out
        while (response.status === 429) {
            console.error(`Request rejected (429), wait a little bit before retrying`);
            response = await new Promise(resolve => {
                setTimeout(async () => {
                    resolve(await fetch(url));
                }, timeOut)
            });

            timeOut += 500;
        }

        // If success return the response
        if (response.status === 200) {
            return response;
        } else {
            throw new Error(`Error ${response.status}`);
        }
    }
};