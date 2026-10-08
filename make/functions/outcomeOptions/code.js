function outcomeOptions(outcome, language, targetLanguage, instructions) {
	var options = {};
	if (language && language !== 'auto') options.language = language;
	if (outcome === 'translation') {
		options.target_language = targetLanguage || 'eng';
		if (instructions) options.translation_instructions = instructions;
	}
	return options;
}
