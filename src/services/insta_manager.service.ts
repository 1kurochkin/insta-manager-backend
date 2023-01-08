import puppeteer from "puppeteer";
import {ElementHandle} from "puppeteer";
import axios from "axios";

class InstaManagerService {
    domain = 'https://www.instagram.com'
    cookies: Array<any> = [];
    appId: string | undefined;

    constructor(
        private readonly username: string,
        private readonly password: string,
        private readonly puppeteerService: typeof puppeteer,
        private readonly axiosService: typeof axios
    ) {
        this.username = username;
        this.password = password;
        this.puppeteerService = puppeteerService;
        this.axiosService = axiosService;
    }

    async fetch(url: string) {
        return axios(
            `${this.domain}/api/v1/${url}`,
            {headers: {'x-ig-app-id': this.appId, 'cookies': this.cookies}}
        )
    }
    setCookies(cookies: Array<any>) {
        this.cookies = cookies;
    }
    setAppId(appId: string) {
        this.appId = appId;
    }

    async login() {
        const browser = await this.puppeteerService.launch();
        const page = await browser.newPage();
        await page.goto(this.domain);

        // @ts-ignore
        const usernameInput = await page.waitForSelector("input[name='username']");
        // @ts-ignore
        const passwordInput = await page.waitForSelector("input[name='password']");
        if(usernameInput && passwordInput) {
            await usernameInput.type(this.username);
            await passwordInput.type(this.password);
            await page.evaluate(() => {
                (document.querySelector('button[type=submit]') as unknown as ElementHandle).click();
            });

            await new Promise(r => setTimeout(r, 5000));
            this.setCookies(await page.cookies());
        } else throw 'There is not inputs for sign in!'
    }
    async getUserInfo (nickname: string) {
        const response = await this.fetch(`users/web_profile_info/?username=${nickname}`);
        console.log(response); // data.user.id // data.user.edge_followed_by.count // data.user.edge_follow.count
    }
    async getFollowers (userId: string, count: number) {
        const response = await this.fetch(`friendships/${userId}/followers/?count=${count}&search_surface=follow_list_page`);
        console.log(response); // data.users.username
    }
    async getFollowings (userId: string, count: number) {
        const response = await this.fetch(`friendships/${userId}/following/?count=${count}`);
        console.log(response); // data.users.username
    }
    async getUnfollowed (followers: Array<{username: string}>, following: Array<{username: string}>) {
        const setOfFollowers = new Set(followers.map(follower => follower.username));
        return following.reduce((acc, following) => {
            if(!setOfFollowers.has(following.username)) {
                acc.push(following)
            }
            return acc;
        }, [] as Array<any>);
    }
}
