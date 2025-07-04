import browser from "webextension-polyfill";

browser.runtime.onInstalled.addListener(() => {
	console.log("web-helper extension installed");
});

// Listen for messages from popup
browser.runtime.onMessage.addListener((message) => {
	if (message.type === "getData") {
		return Promise.resolve({ data: "Hello from web-helper!" });
	}
});
