const puppeteer = require('puppeteer');
const axios = require('axios');

class InstaManagerService {
    domain = 'https://www.instagram.com'
    cookies;
    appId;
    puppeteerService;
    axiosService;

    constructor(username, password, puppeteerService, axiosService) {
        this.username = username;
        this.password = password;
        this.puppeteerService = puppeteerService;
        this.axiosService = axiosService;
    }

    setCookies(cookies) {
        this.cookies = cookies;
    }

    async login(instaPage) {
        // const browser = await this.puppeteerService.launch();
        // const page = await browser.newPage();
        // await page.goto(this.domain);

        const usernameInput = await instaPage.waitForSelector("input[name='username']");
        const passwordInput = await instaPage.waitForSelector("input[name='password']");

        await usernameInput.type(this.username);
        await passwordInput.type(this.password);

        await instaPage.evaluate(() => {
            document.querySelector('button[type=submit]').click();
        });

        await new Promise(r => setTimeout(r, 5000));
        this.setCookies(await instaPage.cookies());
    }
    async getUserInfo (nickname) {
        const response = await axios(`${this.domain}/api/v1/users/web_profile_info/?username=${nickname}`);
        console.log(response); // data.user.id // data.user.edge_followed_by.count // data.user.edge_follow.count
    }
    async getFollowers (userId, count) {
        const response = await axios(`${this.domain}/api/v1/friendships/${userId}/followers/?count=${count}&search_surface=follow_list_page`);
        console.log(response); // data.users.username
    }
    async getFollowings (userId, count) {
        const response = await axios(`${this.domain}/api/v1/friendships/${userId}/following/?count=${count}`);
        console.log(response); // data.users.username
    }
    async getUnfollowed (followers, following) {
        const setOfFollowers = new Set(followers.map(follower => follower.username));
        return following.reduce((acc, following) => {
            if(!setOfFollowers.has(following.username)) {
                acc.push(following)
            }
            return acc;
        }, []);
    }
}
