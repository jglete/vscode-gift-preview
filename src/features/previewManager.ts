/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Logger } from '../logger';
import { disposeAll } from '../util/dispose';
import { GIFTFileTopmostLineMonitor } from '../util/topmostLineMonitor';
import { GIFTPreview, PreviewSettings } from './preview';
import { GIFTPreviewConfigurationManager } from './previewConfig';
import { GIFTContentProvider } from './previewContentProvider';


export class GIFTPreviewManager implements vscode.WebviewPanelSerializer {
	private static readonly GIFTPreviewActiveContextKey = 'GIFTPreviewFocus';

	private readonly _topmostLineMonitor = new GIFTFileTopmostLineMonitor();
	private readonly _previewConfigurations = new GIFTPreviewConfigurationManager();
	private readonly _previews: GIFTPreview[] = [];
	private _activePreview: GIFTPreview | undefined = undefined;
	private readonly _disposables: vscode.Disposable[] = [];

	public constructor(
		private readonly _contentProvider: GIFTContentProvider,
		private readonly _logger: Logger,
	) {
		this._disposables.push(vscode.window.registerWebviewPanelSerializer(GIFTPreview.viewType, this));
	}

	public dispose(): void {
		disposeAll(this._disposables);
		disposeAll(this._previews);
	}

	public refresh() {
		for (const preview of this._previews) {
			preview.refresh();
		}
	}

	public updateConfiguration() {
		for (const preview of this._previews) {
			preview.updateConfiguration();
		}
	}

	public preview(
		resource: vscode.Uri,
		previewSettings: PreviewSettings
	): void {
		let preview = this.getExistingPreview(resource, previewSettings);
		if (preview) {
			preview.reveal(previewSettings.previewColumn);
		} else {
			preview = this.createNewPreview(resource, previewSettings);
		}

		preview.update(resource);
	}

	public get activePreviewResource() {
		return this._activePreview && this._activePreview.resource;
	}

	public toggleLock() {
		const preview = this._activePreview;
		if (preview) {
			preview.toggleLock();

			// Close any previews that are now redundant, such as having two dynamic previews in the same editor group
			for (const otherPreview of this._previews) {
				if (otherPreview !== preview && preview.matches(otherPreview)) {
					otherPreview.dispose();
				}
			}
		}
	}

	public async deserializeWebviewPanel(
		webview: vscode.WebviewPanel,
		state: any
	): Promise<void> {
		const preview = await GIFTPreview.revive(
			webview,
			state,
			this._contentProvider,
			this._previewConfigurations,
			this._logger,
			this._topmostLineMonitor);

		this.registerPreview(preview);
	}

	private getExistingPreview(
		resource: vscode.Uri,
		previewSettings: PreviewSettings
	): GIFTPreview | undefined {
		return this._previews.find(preview =>
			preview.matchesResource(resource, previewSettings.previewColumn, previewSettings.locked));
	}

	private createNewPreview(
		resource: vscode.Uri,
		previewSettings: PreviewSettings
	): GIFTPreview {
		const preview = GIFTPreview.create(
			resource,
			previewSettings.previewColumn,
			previewSettings.locked,
			this._contentProvider,
			this._previewConfigurations,
			this._logger,
			this._topmostLineMonitor);

		this.setPreviewActiveContext(true);
		this._activePreview = preview;
		return this.registerPreview(preview);
	}

	private registerPreview(
		preview: GIFTPreview
	): GIFTPreview {
		this._previews.push(preview);

		preview.onDispose(() => {
			const existing = this._previews.indexOf(preview);
			if (existing === -1) {
				return;
			}

			this._previews.splice(existing, 1);
			if (this._activePreview === preview) {
				this.setPreviewActiveContext(false);
				this._activePreview = undefined;
			}
		});

		preview.onDidChangeViewState(({ webviewPanel }) => {
			disposeAll(this._previews.filter(otherPreview => preview !== otherPreview && preview!.matches(otherPreview)));
			this.setPreviewActiveContext(webviewPanel.active);
			this._activePreview = webviewPanel.active ? preview : undefined;
		});

		return preview;
	}

	private setPreviewActiveContext(value: boolean) {
		vscode.commands.executeCommand('setContext', GIFTPreviewManager.GIFTPreviewActiveContextKey, value);
	}
}
