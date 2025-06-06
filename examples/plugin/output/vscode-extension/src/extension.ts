import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	console.log("Extension code-assistant is now active!");

	let disposable = vscode.commands.registerCommand(
		"code-assistant.helloWorld",
		() => {
			vscode.window.showInformationMessage(
				"Hello World from code-assistant!"
			);
		}
	);

	context.subscriptions.push(disposable);
}

export function deactivate() {}
