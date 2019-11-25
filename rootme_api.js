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

    search: async function(query){
        const url = `https://www.root-me.org/?page=recherche&lang=fr&recherche=${encodeURI(query)}`;
        const usernameRegex = /^\/(?<username>.+)\?/;

        try {

            const response = await  this.safeFetch(url);
            const html = parser.parse(await response.text());

            const results = html.querySelectorAll(".t-body.tb-padding ul li a.forum");

            return results.map(result => {
                return {
                    realUsername: result.childNodes[0].rawText,
                    username: result.attributes.href.match(usernameRegex).groups.username
                };
            });

        } catch (e) {
            console.log("Exception!!!!", e);
            return [];
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