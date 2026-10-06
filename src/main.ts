const SEARCH_START_INDEX = 0;
const MAX_SEARCH_RESULTS = 100;
const TRIGGER_INTERVAL_MINUTES = 10;

/**
 * 検索クエリ用にラベル名を安全にサニタイズ（ダブルクォートの除去）する
 */
function sanitizeLabelForQuery(labelName: string): string {
	return labelName.replace(/"/g, "");
}

/**
 * フルパスのラベル名から、親ラベルのパス一覧を階層順（浅い順）に抽出する
 * 例: "Team/Dev/Backend" -> ["Team", "Team/Dev"]
 * 空セグメント（先頭・末尾・連続スラッシュ）は除外して安全に処理する
 */
function extractParentPaths(fullName: string): string[] {
	const parts = fullName
		.split("/")
		.map((part) => part.trim())
		.filter((part) => part.length > 0);

	if (parts.length <= 1) {
		return [];
	}

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
 * 大文字小文字の違いによる重複作成例外を防止する
 */
function getOrCreateLabel(
	labelMap: Map<string, GoogleAppsScript.Gmail.GmailLabel>,
	path: string,
): GoogleAppsScript.Gmail.GmailLabel {
	const normalizedKey = path.toLowerCase();
	const existingLabel = labelMap.get(normalizedKey);
	if (existingLabel !== undefined) {
		return existingLabel;
	}

	// フォールバック: キャッシュ未登録だが既に存在するか確認
	const fetchedLabel = GmailApp.getUserLabelByName(path);
	if (fetchedLabel !== null) {
		labelMap.set(normalizedKey, fetchedLabel);
		return fetchedLabel;
	}

	try {
		const createdLabel = GmailApp.createLabel(path);
		labelMap.set(normalizedKey, createdLabel);
		return createdLabel;
	} catch (error) {
		// 競合等ですでに作成されていた場合の再取得
		const retryLabel = GmailApp.getUserLabelByName(path);
		if (retryLabel !== null) {
			labelMap.set(normalizedKey, retryLabel);
			return retryLabel;
		}
		throw error;
	}
}

/**
 * 1つの子ラベルに対して未付与の親ラベルを同期する
 */
function syncSingleChildLabel(
	childLabel: GoogleAppsScript.Gmail.GmailLabel,
	labelMap: Map<string, GoogleAppsScript.Gmail.GmailLabel>,
	updatedThreadIds: Set<string>,
): { totalOperations: number } {
	const fullName = childLabel.getName();
	const parentPaths = extractParentPaths(fullName);
	let totalOperations = 0;

	for (const parentPath of parentPaths) {
		const parentLabel = getOrCreateLabel(labelMap, parentPath);
		const safeFullName = sanitizeLabelForQuery(fullName);
		const safeParentPath = sanitizeLabelForQuery(parentPath);
		const query = `label:"${safeFullName}" -label:"${safeParentPath}"`;

		const threads = GmailApp.search(
			query,
			SEARCH_START_INDEX,
			MAX_SEARCH_RESULTS,
		);

		if (threads.length > 0) {
			parentLabel.addToThreads(threads);
			for (const thread of threads) {
				updatedThreadIds.add(thread.getId());
			}
			Logger.log(
				`[付与成功] ${threads.length}件のスレッドに「${parentPath}」を付与 (子ラベル: ${fullName})`,
			);
			totalOperations += threads.length;

			if (threads.length === MAX_SEARCH_RESULTS) {
				Logger.log(
					`[注意] 「${parentPath}」の付与対象スレッドが上限（${MAX_SEARCH_RESULTS}件）に達しました。次回実行時に残りが処理されます。`,
				);
			}
		}
	}

	return { totalOperations };
}

/**
 * Gmailの階層化された子ラベルが付与されたスレッドを検索し、
 * 未付与の親ラベルを自動で付与・同期するエントリポイント関数
 */
function syncParentLabels(): void {
	const userLabels = GmailApp.getUserLabels();

	// 階層構造を持つラベル（親パスが存在するもの）のみを抽出
	const childLabels = userLabels.filter(
		(label) => extractParentPaths(label.getName()).length > 0,
	);

	// 大文字・小文字を正規化したキーでマップを初期化
	const labelMap = new Map<string, GoogleAppsScript.Gmail.GmailLabel>();
	for (const label of userLabels) {
		labelMap.set(label.getName().toLowerCase(), label);
	}

	const updatedThreadIds = new Set<string>();
	let totalLabelOperations = 0;

	for (const childLabel of childLabels) {
		try {
			const result = syncSingleChildLabel(
				childLabel,
				labelMap,
				updatedThreadIds,
			);
			totalLabelOperations += result.totalOperations;
		} catch (error) {
			Logger.log(
				`[エラー] 子ラベル「${childLabel.getName()}」の同期中にエラーが発生しました: ${error}`,
			);
		}
	}

	Logger.log(
		`全処理完了: 合計 ${updatedThreadIds.size}件のユニークなスレッドを更新しました（親ラベル付与操作: 延べ ${totalLabelOperations}件）。`,
	);
}

/**
 * 既存の syncParentLabels トリガーを全削除する
 */
function deleteTrigger(): void {
	const triggers = ScriptApp.getProjectTriggers();
	for (const trigger of triggers) {
		if (trigger.getHandlerFunction() === "syncParentLabels") {
			ScriptApp.deleteTrigger(trigger);
			Logger.log(`既存のトリガーを削除しました: ${trigger.getUniqueId()}`);
		}
	}
}

/**
 * 定期実行トリガーをセットアップする関数
 * （二重登録を防ぐため、既存のトリガーを削除してから再作成します）
 */
function setupTrigger(): void {
	deleteTrigger();

	ScriptApp.newTrigger("syncParentLabels")
		.timeBased()
		.everyMinutes(TRIGGER_INTERVAL_MINUTES)
		.create();

	Logger.log(
		`定期実行トリガーを設定しました: ${TRIGGER_INTERVAL_MINUTES}分ごとに syncParentLabels を実行します。`,
	);
}
