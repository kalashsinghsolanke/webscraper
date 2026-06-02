const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function extractBusinessData(text) {

    try {

        if (!text || text.trim() === "") {
            return {
                company_name: "",
                emails: [],
                phones: [],
                linkedin: "",
                instagram: "",
                address: "",
                industry: ""
            };
        }

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "Extract business details from website text and return ONLY valid JSON. Your response must be parsed as a JSON object containing keys: company_name, emails, phones, linkedin, instagram, address, industry. Do not add markdown formatting outside the JSON."
                },
                {
                    role: "user",
                    content: `Extract:
* company_name
* emails
* phones
* linkedin
* instagram
* address
* industry

Website Text:
${text}`
                }
            ],
            temperature: 0,
            response_format: {
                type: "json_object"
            }
        });

        const content = completion.choices[0].message.content;
        return JSON.parse(content);

    } catch (error) {

        console.error("Groq Extraction Error:", error);

        return {
            company_name: "",
            emails: [],
            phones: [],
            linkedin: "",
            instagram: "",
            address: "",
            industry: "",
            error: error.message
        };
    }
}

module.exports = {
    extractBusinessData
};
