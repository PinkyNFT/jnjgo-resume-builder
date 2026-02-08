/**
 * Test suite for gap detection utilities
 * Run with: npm test
 */

import { analyzeGapCoverage, hasUnresolvedGapQuestions, hasGapDiscussion } from '../gapDetection';
import { Message } from '../../types';

describe('Gap Detection', () => {
    describe('analyzeGapCoverage', () => {
        it('should detect unanswered gap questions', () => {
            const messages: Message[] = [
                { role: 'model', text: 'I notice a gap between 2020 and 2022. What were you doing during that time?', isHint: false },
                { role: 'user', text: 'Yes', isHint: false },
            ];

            const result = analyzeGapCoverage(messages);

            expect(result.hasUnresolvedGaps).toBe(true);
            expect(result.gapQuestions).toHaveLength(1);
            expect(result.gapQuestions[0].answerQuality).toBe('insufficient');
        });

        it('should recognize adequate gap explanations', () => {
            const messages: Message[] = [
                { role: 'model', text: 'Can you explain the gap between 2020 and 2022?', isHint: false },
                { role: 'user', text: 'I took medical leave to recover from surgery and care for a family member', isHint: false },
            ];

            const result = analyzeGapCoverage(messages);

            expect(result.hasUnresolvedGaps).toBe(false);
            expect(result.confidence).toBeGreaterThan(0.9);
            expect(result.gapQuestions[0].answerQuality).toBe('adequate');
        });

        it('should avoid false positives on non-gap contexts', () => {
            const messages: Message[] = [
                { role: 'model', text: 'Tell me about your work on gap analysis for the project', isHint: false },
                { role: 'user', text: 'I performed gap analysis to identify system deficiencies', isHint: false },
            ];

            const result = analyzeGapCoverage(messages);

            // Should NOT detect this as a gap question
            expect(result.gapQuestions).toHaveLength(0);
        });

        it('should handle multiple gap questions', () => {
            const messages: Message[] = [
                { role: 'model', text: 'I see a gap in 2019. What happened?', isHint: false },
                { role: 'user', text: 'I was traveling and doing freelance work', isHint: false },
                { role: 'model', text: 'And what about the gap in 2021?', isHint: false },
                { role: 'user', text: 'Yes', isHint: false },
            ];

            const result = analyzeGapCoverage(messages);

            expect(result.gapQuestions).toHaveLength(2);
            expect(result.gapQuestions[0].answerQuality).toBe('adequate');
            expect(result.gapQuestions[1].answerQuality).toBe('insufficient');
            expect(result.hasUnresolvedGaps).toBe(true);
        });

        it('should handle no gap questions', () => {
            const messages: Message[] = [
                { role: 'model', text: 'Tell me about your skills', isHint: false },
                { role: 'user', text: 'I know Python, React, and AWS', isHint: false },
            ];

            const result = analyzeGapCoverage(messages);

            expect(result.hasUnresolvedGaps).toBe(false);
            expect(result.gapQuestions).toHaveLength(0);
            expect(result.confidence).toBe(1);
        });

        it('should recognize various gap answer formats', () => {
            const testCases = [
                'I was in school completing my masters degree',
                'took a sabbatical to travel and volunteer',
                'focused on parenting and family responsibilities',
                'underwent medical treatment and recovery',
                'was searching for the right opportunity',
                'did freelance consulting during that period',
            ];

            testCases.forEach(answer => {
                const messages: Message[] = [
                    { role: 'model', text: 'What about the employment gap?', isHint: false },
                    { role: 'user', text: answer, isHint: false },
                ];

                const result = analyzeGapCoverage(messages);
                expect(result.gapQuestions[0].answerQuality).toBe('adequate');
            });
        });
    });

    describe('hasGapDiscussion', () => {
        it('should detect voluntary gap mentions', () => {
            const messages: Message[] = [
                { role: 'user', text: 'I should mention I took a medical leave in 2021', isHint: false },
                { role: 'model', text: 'Thank you for sharing that', isHint: false },
            ];

            expect(hasGapDiscussion(messages)).toBe(true);
        });

        it('should detect when model asked gap questions', () => {
            const messages: Message[] = [
                { role: 'model', text: 'Can you explain the gap in your resume?', isHint: false },
                { role: 'user', text: 'Sure, I was studying', isHint: false },
            ];

            expect(hasGapDiscussion(messages)).toBe(true);
        });

        it('should return false when no gaps discussed', () => {
            const messages: Message[] = [
                { role: 'model', text: 'What are your skills?', isHint: false },
                { role: 'user', text: 'JavaScript and Python', isHint: false },
            ];

            expect(hasGapDiscussion(messages)).toBe(false);
        });
    });
});
