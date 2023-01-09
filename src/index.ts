import express, {Request, Response, Application} from 'express';
import bodyParser from "body-parser";
import puppeteer from "puppeteer";
import axios from "axios";
import {InstaManagerService} from "./services/insta_manager.service";
import {startServer} from "./server";


(async () => {
    try {
        // INITIAL PUPPETEER
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://www.instagram.com');

        // INITIAL INSTA-MANAGER-SERVICE
        const instaManagerService = new InstaManagerService('rapira.88', 'Aawei6ha')
        await instaManagerService.login(page);

        // START SERVER
        await startServer(instaManagerService)
    } catch (e) {
        throw e;
    }
})()