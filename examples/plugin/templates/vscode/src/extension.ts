import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	console.log("Extension <%= name %> is now active!");

	let disposable = vscode.commands.registerCommand(
		"<%= name %>.helloWorld",
		() => {
			vscode.window.showInformationMessage(
				"Hello World from <%= name %>!"
			);
		}
	);

	context.subscriptions.push(disposable);
}

export function deactivate() {}
