const readline = require('readline');
const colors = require('colors');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const https = require('https');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

let getValuesFromUser = () => {
    rl.question('Enter an URL to fetch images (contains protocol) : '.blue, async url => {
        const validUrl = validURL(url);
        if (!validUrl) {
            console.log("Please enter a valid URL")
            return getValuesFromUser()
        }
        console.log('Start Fetching Images Urls..');
        const images = await fetchImages(url);
        if (!images || images.length === 0) return console.log("No images found on this site.")

        rl.question("Insert Saving Directory: ".rainbow, dir => {
            // Creating new folder directory
            fs.mkdir(dir, {
                recursive: true
            }, async (err) => {
                if (err) {
                    console.error('Couldnt create folder');
                    return;
                    // throw new Error('Couldnt create folder');
                }

                console.log('Start download all images');
                await downloadImages(dir, images);

                console.log('Start creating html file');
                await generateHtml(dir, images);
            })
        });
    });
};
getValuesFromUser();

/**
 * 
 * @description The function recive url and return all images links in the wanted url.
 * 
 * @param {string} url - Wanted url for web scraping and download wanted images.
 * 
 * @returns Array of url string for all images in the wanted url.
 */
const fetchImages = async (url) => {
    const images = [];
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, {
        waitUntil: 'networkidle2',
    });
    const html = await page.evaluate(() => document.body.innerHTML);
    const $ = cheerio.load(html);

    await $('img').each((index, image) => {
        const img = $(image).attr('src');
        if (img.includes('http')) {
            images.push(img);
        }
    });

    return await images;
};


/**
 * 
 * @description The function receive output name and the fetched images array.
 * 
 * @param {string} path - the name of the output folder that we received from the user.
 * 
 * @param {Array} imagesUrls - Array Of fetched urls to manipulate them
 * 
 * @returns created output folder with the images inside.
 */
const downloadImages = async (path, imagesUrls) => {
    for (const imageUrl of imagesUrls) {
        const fileName = imageUrl.match(/[\w\.\$]+(?=png|jpg|gif)\w+/g);

        if (fileName && fileName.length > 0) {
            await https.get(imageUrl, resp => {
                try {
                    resp.pipe(fs.createWriteStream(`./${path}/${fileName}`))
                } catch (err) {
                    console.log(imageUrl)
                }
            });
        }
    }
};

/**
 * 
 * @description The function receive output name and the fetched images array.
 * 
 * @param {string} path - the name of the output folder that we received from the user.
 * 
 * @param {Array} images - Array Of fetched urls to manipulate them
 * 
 * @returns a html file to the output folder.
 */
const generateHtml = async (path, images) => {
    const header = `<link rel="stylesheet" href="../public/style.css">`;
    const parsedImages = images.filter(image => image.match(/[\w\.\$]+(?=png|jpg|gif)\w+/g));
    const validImages = parsedImages.map(image => image.match(/[\w\.\$]+(?=png|jpg|gif)\w+/g));
    const body =
        `<div class="container">
            ${validImages.map((image ,index) => `
            <img src="/${path}/${image}"/>
            </div>
            `).join('')}
        </div>
    `;

    fs.writeFile(`./${path}/` + 'index.html',
        '<html><head>' + header + '</head><body>' + body + '</body></html>', err => {
            if (err) console.error(err);
            console.log("Saved !")
        });
};


const validURL = (str) => {
    const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}