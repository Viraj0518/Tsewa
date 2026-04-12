import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../src/components/ui/Button';
import { useAddPrompt } from '../../../src/modules/profile/hooks';
import { colors } from '../../../src/theme/colors';
import { scale } from '../../../src/theme/responsive';
import { typography, fontSize, fontWeight } from '../../../src/theme/typography';

const PROMPTS = [
  'My favorite Tibetan dish is...',
  'The teaching that changed my life...',
  'When I think of home, I think of...',
  'My perfect weekend looks like...',
  "I'm passionate about preserving...",
  'A Tibetan tradition I love is...',
  'The best trip I ever took was...',
  'Something that always makes me laugh...',
  'My hidden talent is...',
  "I'm looking for someone who...",
  'The last book I read was...',
  'My favorite place in the world is...',
  'A cause I care deeply about...',
  'The way to my heart is...',
  'If I could have dinner with anyone...',
] as const;

interface PromptAnswer {
  question: string;
  answer: string;
}

export default function PromptsScreen() {
  const router = useRouter();
  const addPromptMutation = useAddPrompt();

  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<PromptAnswer[]>([]);

  const completedCount = completed.length;
  const canContinue = completedCount === 3;

  const handlePromptPress = (prompt: string) => {
    // If already completed, allow un-completing
    const existingIndex = completed.findIndex((c) => c.question === prompt);
    if (existingIndex >= 0) {
      setCompleted((prev) => prev.filter((_, i) => i !== existingIndex));
      setExpandedPrompt(prompt);
      return;
    }

    // If already 3 completed, don't allow expanding new ones
    if (completedCount >= 3) return;

    setExpandedPrompt(expandedPrompt === prompt ? null : prompt);
  };

  const handleSaveAnswer = (prompt: string) => {
    const answer = (answers[prompt] || '').trim();
    if (answer.length < 10) return;

    setCompleted((prev) => [...prev, { question: prompt, answer }]);
    setExpandedPrompt(null);
  };

  const isCompleted = (prompt: string) =>
    completed.some((c) => c.question === prompt);

  const getAnswer = (prompt: string) =>
    completed.find((c) => c.question === prompt)?.answer || answers[prompt] || '';

  const onContinue = async () => {
    // Save all prompts to API
    for (const item of completed) {
      addPromptMutation.mutate({ question: item.question, answer: item.answer });
    }
    router.push('/(auth)/onboarding/location');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Conversation starters</Text>
        <Text style={styles.subtitle}>
          Pick 3 prompts and write your answers
        </Text>
      </View>

      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>{completedCount} / 3 completed</Text>
      </View>

      <View style={styles.promptList}>
        {PROMPTS.map((prompt) => {
          const isDone = isCompleted(prompt);
          const isExpanded = expandedPrompt === prompt;
          const currentAnswer = answers[prompt] || '';
          const isDisabled = completedCount >= 3 && !isDone && !isExpanded;

          return (
            <View key={prompt}>
              <Pressable
                onPress={() => handlePromptPress(prompt)}
                style={[
                  styles.promptCard,
                  isDone && styles.promptCardDone,
                  isExpanded && styles.promptCardExpanded,
                  isDisabled && styles.promptCardDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.promptText,
                    isDone && styles.promptTextDone,
                  ]}
                >
                  {prompt}
                </Text>
                {isDone && (
                  <Text style={styles.doneIndicator}>Done</Text>
                )}
              </Pressable>

              {isExpanded && (
                <View style={styles.answerSection}>
                  <TextInput
                    style={styles.answerInput}
                    placeholder="Write your answer..."
                    placeholderTextColor={colors.gray400}
                    multiline
                    maxLength={300}
                    value={currentAnswer}
                    onChangeText={(text) =>
                      setAnswers((prev) => ({ ...prev, [prompt]: text }))
                    }
                  />
                  <View style={styles.answerFooter}>
                    <Text
                      style={[
                        styles.charCount,
                        currentAnswer.length < 10 && styles.charCountWarn,
                      ]}
                    >
                      {currentAnswer.length}/300
                      {currentAnswer.length < 10 && ' (min 10)'}
                    </Text>
                    <Button
                      title="Save"
                      variant="primary"
                      size="sm"
                      onPress={() => handleSaveAnswer(prompt)}
                      disabled={currentAnswer.trim().length < 10}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          variant="primary"
          size="lg"
          fullWidth
          onPress={onContinue}
          disabled={!canContinue}
          loading={addPromptMutation.isPending}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(32),
  },
  header: {
    marginBottom: scale(16),
  },
  title: {
    ...typography.h1,
    color: colors.black,
    marginBottom: scale(8),
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.gray500,
  },
  counterBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.lavenderLight,
    paddingVertical: scale(6),
    paddingHorizontal: scale(14),
    borderRadius: scale(16),
    marginBottom: scale(20),
  },
  counterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.lavenderDark,
  },
  promptList: {
    gap: scale(10),
  },
  promptCard: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1.5,
    borderColor: colors.gray200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  promptCardDone: {
    borderColor: colors.lavender,
    backgroundColor: colors.lavender,
  },
  promptCardExpanded: {
    borderColor: colors.peach,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  promptCardDisabled: {
    opacity: 0.5,
  },
  promptText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.black,
    fontWeight: fontWeight.medium,
  },
  promptTextDone: {
    color: colors.white,
  },
  doneIndicator: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.semibold,
    marginLeft: scale(8),
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: scale(2),
    paddingHorizontal: scale(8),
    borderRadius: scale(8),
  },
  answerSection: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: colors.peach,
    borderBottomLeftRadius: scale(16),
    borderBottomRightRadius: scale(16),
    padding: scale(16),
  },
  answerInput: {
    fontSize: fontSize.md,
    color: colors.black,
    minHeight: scale(80),
    textAlignVertical: 'top',
    padding: scale(12),
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: scale(12),
    backgroundColor: colors.gray100,
  },
  answerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(12),
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.gray400,
  },
  charCountWarn: {
    color: colors.peach,
  },
  footer: {
    marginTop: scale(24),
  },
});
