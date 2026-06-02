const { extractBusinessData } =
require("./groqextracter");

const axios = require("axios");
const cheerio = require("cheerio");

async function extractEmails(text) {

```
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
           !lower.includes("example.com") &&
           !lower.includes("w3.org") &&
           !lower.includes("bootstrap");
});

return [...new Set(validEmails)];
```

}

async function extractPhones(text) {

```
if (!text) return [];

const phoneRegex =
    /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,5}[\s-]?\d{4}/g;

const matches = text.match(phoneRegex) || [];

const cleaned = matches.map(num => {

    return num.replace(/[^\d+]/g, "");
});

return [...new Set(cleaned)];
```

}

async function fetchPage(url) {

```
try {

    console.log("FETCHING:", url);

    const response = await axios.get(url, {

        timeout: 15000,

        maxRedirects: 5,

        maxContentLength: 5 * 1024 * 1024,

        maxBodyLength: 5 * 1024 * 1024,

        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },

        validateStatus: function (status) {
            return status < 500;
        }
    });

    return (response.data || "").slice(0, 300000);

} catch (error) {

    console.log("FETCH ERROR:", url);
    console.log(error.message);

    return "";
}
```

}

async function scrapeWebsite(url) {

```
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
    let phones = [];

    let linkedin = "";
    let instagram = "";
    let facebook = "";
    let twitter = "";
    let youtube = "";

    // =========================
    // HOMEPAGE
    // =========================

    const homepageHtml =
        await fetchPage(url);

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

    const homepageText =
        $("body").text().slice(0, 100000);

    // =========================
    // BASIC EXTRACTION
    // =========================

    const homepageEmails =
        await extractEmails(homepageText);

    allEmails.push(...homepageEmails);

    const homepagePhones =
        await extractPhones(homepageText);

    phones.push(...homepagePhones);

    // =========================
    // IMPORTANT LINKS
    // =========================

    const visited = new Set();

    visited.add(
        url.toLowerCase().replace(/\/$/, "")
    );

    const importantKeywords = [
        "contact",
        "about"
    ];

    let links = [];

    $("a").each((i, el) => {

        const href = $(el).attr("href");

        if (href) {

            links.push(href);

            // MAILTO
            if (href.startsWith("mailto:")) {

                const email =
                    href.replace("mailto:", "");

                allEmails.push(email);
            }

            // SOCIALS
            if (href.includes("linkedin.com")) {
                linkedin = href;
            }

            if (href.includes("instagram.com")) {
                instagram = href;
            }

            if (href.includes("facebook.com")) {
                facebook = href;
            }

            if (
                href.includes("twitter.com") ||
                href.includes("x.com")
            ) {
                twitter = href;
            }

            if (href.includes("youtube.com")) {
                youtube = href;
            }
        }
    });

    links = [...new Set(links)];

    const filteredLinks = links.filter(link => {

        return importantKeywords.some(keyword =>
            link.toLowerCase().includes(keyword)
        );
    });

    // =========================
    // VISIT IMPORTANT PAGES
    // =========================

    for (const link of filteredLinks.slice(0, 2)) {

        let fullUrl = "";

        if (link.startsWith("http")) {

            fullUrl = link;

        } else {

            fullUrl =
                url.replace(/\/$/, "") +
                "/" +
                link.replace(/^\//, "");
        }

        const normalized =
            fullUrl.toLowerCase().replace(/\/$/, "");

        if (visited.has(normalized)) {

            console.log("ALREADY VISITED:", fullUrl);

            continue;
        }

        visited.add(normalized);

        console.log("VISITING:", fullUrl);

        const pageHtml =
            await fetchPage(fullUrl);

        if (pageHtml) {

            const $$ = cheerio.load(pageHtml);

            const pageText =
                $$("body").text().slice(0, 50000);

            const pageEmails =
                await extractEmails(pageText);

            allEmails.push(...pageEmails);

            const pagePhones =
                await extractPhones(pageText);

            phones.push(...pagePhones);
        }
    }

    // =========================
    // CLEANUP
    // =========================

    allEmails = [...new Set(allEmails)];
    phones = [...new Set(phones)];

    links = [];

    // =========================
    // AI EXTRACTION
    // =========================

    const aiData =
        await extractBusinessData(
            homepageText.slice(0, 12000)
        );

    console.log("AI DATA:", aiData);

    // =========================
    // FINAL RESPONSE
    // =========================

    return {

        success: true,

        website: url,

        company_name:
            aiData.company_name || "",

        email:
            aiData.emails?.[0] ||
            allEmails[0] ||
            "",

        emails:
            aiData.emails?.length
                ? aiData.emails
                : allEmails,

        phone:
            aiData.phones?.[0] ||
            phones[0] ||
            "",

        phones:
            aiData.phones?.length
                ? aiData.phones
                : phones,

        linkedin:
            aiData.linkedin || linkedin,

        instagram:
            aiData.instagram || instagram,

        address:
            aiData.address || "",

        industry:
            aiData.industry || "",

        facebook,

        twitter,

        youtube
    };

} catch (error) {

    console.log("SCRAPER ERROR:");
    console.log(error);

    return {

        success: false,

        website: url,

        emails: [],

        phones: [],

        error: error.message
    };
}
```

}

module.exports = {
scrapeWebsite
};
