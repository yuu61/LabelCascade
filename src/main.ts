const SEARCH_START_INDEX = 0;
const MAX_SEARCH_RESULTS = 100;

/**
 * フルパスのラベル名から、親ラベルのパス一覧を階層順（浅い順）に抽出する
 * 例: "Team/Dev/Backend" -> ["Team", "Team/Dev"]
 */
function extractParentPaths(fullName: string): string[] {
	const parts = fullName.split("/");
	const parentPaths: string[] = [];
	let currentPath = "";

	for (let i = 0; i < parts.length - 1; i += 1) {
		const part = parts[i];
		if (part !== undefined) {
			if (i === 0) {
				currentPath = part;
			} else {
				currentPath = `${currentPath}/${part}`;
			}
			parentPaths.push(currentPath);
		}
	}

	return parentPaths;
}

/**
 * 指定パスのラベルを取得、未作成の場合は新規作成してキャッシュマップに登録する
 */
function getOrCreateLabel(
	labelMap: Map<string, GoogleAppsScript.Gmail.GmailLabel>,
	path: string,
): GoogleAppsScript.Gmail.GmailLabel {
	const existingLabel = labelMap.get(path);
	if (existingLabel !== undefined) {
		return existingLabel;
	}

	const createdLabel = GmailApp.createLabel(path);
	labelMap.set(path, createdLabel);
	return createdLabel;
}

/**
 * 1つの子ラベルに対して未付与の親ラベルを同期し、更新されたスレッド数を返す
 */
function syncSingleChildLabel(
	childLabel: GoogleAppsScript.Gmail.GmailLabel,
	labelMap: Map<string, GoogleAppsScript.Gmail.GmailLabel>,
): number {
	const fullName = childLabel.getName();
	const parentPaths = extractParentPaths(fullName);
	let updatedThreadsForChild = 0;

	for (const parentPath of parentPaths) {
		const parentLabel = getOrCreateLabel(labelMap, parentPath);
		const query = `label:"${fullName}" -label:"${parentPath}"`;
		const threads = GmailApp.search(
			query,
			SEARCH_START_INDEX,
			MAX_SEARCH_RESULTS,
		);

		if (threads.length > 0) {
			parentLabel.addToThreads(threads);
			Logger.log(
				`[付与成功] ${threads.length}件のスレッドに「${parentPath}」を付与 (子ラベル: ${fullName})`,
			);
			updatedThreadsForChild += threads.length;
		}
	}

	return updatedThreadsForChild;
}

/**
 * Gmailの階層化された子ラベルが付与されたスレッドを検索し、
 * 未付与の親ラベルを自動で付与・同期するエントリポイント関数
 */
function syncParentLabels(): void {
	const userLabels = GmailApp.getUserLabels();

	const childLabels = userLabels.filter((label) =>
		label.getName().includes("/"),
	);

	const labelMap = new Map<string, GoogleAppsScript.Gmail.GmailLabel>();
	for (const label of userLabels) {
		labelMap.set(label.getName(), label);
	}

	let totalUpdatedThreads = 0;

	for (const childLabel of childLabels) {
		totalUpdatedThreads += syncSingleChildLabel(childLabel, labelMap);
	}

	Logger.log(
		`全処理完了: 合計 ${totalUpdatedThreads}件のスレッドを更新しました。`,
	);
}
