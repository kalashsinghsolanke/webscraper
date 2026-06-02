const axios = require("axios");
const cheerio = require("cheerio");

async function extractEmails(text) {

    if (!text) return [];

    const emailRegex =
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

    const matches = text.match(emailRegex) || [];

    const validEmails = matches.filter(email => {
        const lower = email.toLowerCase();
        return !lower.endsWith(".png") &&
               !lower.endsWith(".jpg") &&
               !lower.endsWith(".jpeg") &&
               !lower.endsWith(".gif") &&
               !lower.endsWith(".webp") &&
               !lower.endsWith(".svg") &&
               !lower.endsWith("example.com") &&
               !lower.endsWith("w3.org") &&
               !lower.endsWith("bootstrap.com") &&
               !lower.includes("sentry.io");
    });

    return [...new Set(validEmails)];
}

async function extractPhones(text) {

    if (!text) return [];

    // Captures 10-digit Indian mobile numbers with optional spaces/hyphens
    const phoneRegex = /(?:\+?91[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}/g;

    const matches = text.match(phoneRegex) || [];

    const cleaned = matches.map(num => {
        let clean = num.replace(/[^\d+]/g, "");
        if (clean.startsWith("+91")) {
            clean = clean.slice(3);
        } else if (clean.startsWith("91") && clean.length === 12) {
            clean = clean.slice(2);
        } else if (clean.startsWith("0") && clean.length === 11) {
            clean = clean.slice(1);
        }
        return clean;
    });

    return [...new Set(cleaned.filter(num => num.length === 10))];
}

async function fetchPage(url) {

    try {

        console.log("FETCHING:", url);

        const response = await axios.get(url, {

            timeout: 15000,

            maxRedirects: 5,

            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },

            validateStatus: function (status) {
                return status < 500;
            }
        });

        return response.data || "";

    } catch (error) {

        console.log("FETCH ERROR:", url);
        console.log(error.message);

        return "";
    }
}

async function scrapeWebsite(url) {

    try {

        if (!url || url.trim() === "") {
            return {
                success: false,
                error: "Empty URL"
            };
        }

        if (!url.startsWith("http")) {
            url = "https://" + url;
        }

        let allEmails = [];

        let linkedin = "";
        let instagram = "";
        let facebook = "";
        let twitter = "";
        let youtube = "";
        let phones = [];

        // =========================
        // HOMEPAGE
        // =========================

        const homepageHtml = await fetchPage(url);

        if (!homepageHtml || homepageHtml.length < 50) {

            return {
                success: false,
                website: url,
                emails: [],
                phones: [],
                error: "Website fetch failed"
            };
        }

        const $ = cheerio.load(homepageHtml);

        const homepageText = $("body").text();

        const homepageEmails =
            await extractEmails(homepageText);

        allEmails.push(...homepageEmails);

        const homepagePhones =
            await extractPhones(homepageText);

        phones.push(...homepagePhones);

        // =========================
        // IMPORTANT PAGES
        // =========================

        const visited = new Set();
        visited.add(url.toLowerCase().replace(/\/$/, ""));

        const importantKeywords = [
            "contact",
            "contact-us",
            "about",
            "about-us",
            "team"
        ];

        let links = [];

        $("a").each((i, el) => {

            const href = $(el).attr("href");

            if (href) {

                links.push(href);

                // EXTRACT MAILTO EMAILS
                if (href.startsWith("mailto:")) {

                    const email =
                        href.replace("mailto:", "");

                    allEmails.push(email);
                }

                // LINKEDIN
                if (href.includes("linkedin.com")) {
                    linkedin = href;
                }

                // INSTAGRAM
                if (href.includes("instagram.com")) {
                    instagram = href;
                }

                // FACEBOOK
                if (href.includes("facebook.com")) {
                    facebook = href;
                }

                // TWITTER / X
                if (
                    href.includes("twitter.com") ||
                    href.includes("x.com")
                ) {
                    twitter = href;
                }

                // YOUTUBE
                if (href.includes("youtube.com")) {
                    youtube = href;
                }
            }
        });

        // REMOVE DUPLICATES
        links = [...new Set(links)];

        // FILTER IMPORTANT LINKS
        const filteredLinks = links.filter(link => {

            return importantKeywords.some(keyword =>
                link.toLowerCase().includes(keyword)
            );
        });

        // =========================
        // VISIT IMPORTANT PAGES
        // =========================

        for (const link of filteredLinks.slice(0, 5)) {

            let fullUrl = "";

            if (link.startsWith("http")) {
                fullUrl = link;
            } else {
                fullUrl =
                    url.replace(/\/$/, "") +
                    "/" +
                    link.replace(/^\//, "");
            }

            const normalizedFullUrl = fullUrl.toLowerCase().replace(/\/$/, "");
            if (visited.has(normalizedFullUrl)) {
                console.log("ALREADY VISITED:", fullUrl);
                continue;
            }
            visited.add(normalizedFullUrl);

            console.log("VISITING:", fullUrl);

            const pageHtml = await fetchPage(fullUrl);

            if (pageHtml) {
                const $$ = cheerio.load(pageHtml);
                const pageText = $$("body").text();

                const pageEmails = await extractEmails(pageText);
                allEmails.push(...pageEmails);

                const pagePhones = await extractPhones(pageText);
                phones.push(...pagePhones);
            }
        }

        // REMOVE DUPLICATES
        allEmails = [...new Set(allEmails)];

        return {
            success: true,
            website: url,
            email: allEmails[0] || "",
            emails: [...new Set(allEmails)],
            phone: phones[0] || "",
            phones: [...new Set(phones)],
            linkedin,
            instagram,
            facebook,
            twitter,
            youtube
        };

    } catch (error) {

        console.log("SCRAPER ERROR:", error.message);

        return {
            success: false,
            website: url,
            emails: [],
            error: error.message
        };
    }
}

module.exports = {
    scrapeWebsite
};