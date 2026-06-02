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

        const { website, request_id } = req.body;

        const data = await scrapeWebsite(website);

        res.json({
            request_id,
            ...data
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            error: "Scraping failed"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
