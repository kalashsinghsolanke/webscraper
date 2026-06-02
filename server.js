const express = require("express");
const cors = require("cors");

const { scrapeWebsite } = require("./scrapers/websiteScraper");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API Running");
});

app.post("/scrape", async (req, res) => {

try {

    console.log("BODY:", req.body);

    const body = req.body || {};

    let { website, request_id } = body;

    if (!website) {
        return res.status(400).json({
            error: "Website missing"
        });
    }

    if (!website.startsWith("http")) {
        website = "https://" + website;
    }

    console.log("SCRAPING:", website);

    const data =
        await scrapeWebsite(website);

    console.log("SCRAPER RESULT:", data);

    res.json({
        request_id,
        ...data
    });

} catch (error) {

    console.log("ROUTE ERROR:");
    console.log(error);

    res.status(500).json({
        error: error.message
    });
}

});

const PORT = process.env.PORT || 3000;

process.on("uncaughtException", (err) => {
    console.log("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
    console.log("UNHANDLED REJECTION:", err);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
