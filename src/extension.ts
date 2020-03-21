'use strict';

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let toDartCode = vscode.commands.registerCommand('extension.toDartCode', function () {
		// Get the active text editor
		let editor = vscode.window.activeTextEditor;

		if (editor) {
			let allContent = editor.document.getText();
			let lineCount = editor.document.lineCount;
			let newContent = allContent
				.replace(/public string/g, "String")
				.replace(/public decimal/g, "double")
				.replace(/public DateTime?/g, "DateTime")
				.replace(/public partial/g, "")
				.replace(/public/g, "")
				.replace(/:/, "extends")
				.replace(/IList/g, "List")
				.replace(/{ get; set; }/g, ";")
				.replace(/\w+\s;/g, propertyNameReplacer);

			let matchRes = /class\s\w+/.exec(editor.document.getText());
			let fileName = "";
			if (matchRes !== null && matchRes.length > 0) {
				let first = matchRes[0];
				fileName = normalizeFileName(first.replace("class", "").trim());
			}


			editor.edit(editBuilder => {
				let r = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(lineCount + 1, 0));
				editBuilder.replace(r, newContent);

				editBuilder.insert(new vscode.Position(0, 0), `
					import 'package:json_annotation/json_annotation.dart';

					part '${fileName}.g.dart';

					@JsonSerializable(
						fieldRename: FieldRename.pascal,
						explicitToJson: true,
						)
				`
				);
			});

			vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', [editor.document.uri]);
		}
	});

	let toDartCodeGenerateJsonSerializer = vscode.commands.registerCommand('extension.toDartCodeGenerateJsonSerializer', function () {
		let editor = vscode.window.activeTextEditor;

		if (editor) {
			let document = editor.document;
			let selection = editor.selection;
			let className = document.getText(selection);
			let lineCount = document.lineCount;

			if (!className) {
				let matchRes = /class\s\w+/.exec(editor.document.getText());
				if (matchRes !== null && matchRes.length > 0) {
					let first = matchRes[0];
					className = first.replace("class", "").trim();
				}
			}

			editor.edit(editBuilder => {
				editBuilder.insert(new vscode.Position(lineCount - 1, 0), `

					factory ${className}.fromJson(Map<String, dynamic> json) => _$${className}FromJson(json);

					Map<String, dynamic> toJson() => _$${className}ToJson(this);
				`);
			});
		}
	});

	context.subscriptions.push(toDartCode);
	context.subscriptions.push(toDartCodeGenerateJsonSerializer);
}

function camelize(str: String) {
	return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
		return index === 0 ? word.toLowerCase() : word.toUpperCase();
	}).replace(/\s+/g, '');
}

function propertyNameReplacer(match: any, p1: any, p2: any, p3: any, offset: any, s: String) {
	return camelize(match);
}

function normalizeFileName(str: String) {
	return str.replace(
		/(?:^|\.?)([A-Z])/g,
		function (x, y) { return "_" + y.toLowerCase(); }).replace(/^_/, ""
		);
}