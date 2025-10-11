<?php

namespace App\Services\AI;

class PerformanceAnalysisService
{
    /**
     * Analyze interview performance metrics
     */
    public function analyzePerformance($transcription)
    {
        $performance = [
            'speaking_pace' => $this->analyzeSpeakingPace($transcription),
            'filler_words' => $this->analyzeFillerWords($transcription),
            'response_length' => $this->analyzeResponseLength($transcription),
            'vocabulary_diversity' => $this->analyzeVocabularyDiversity($transcription),
            'engagement_score' => $this->calculateEngagementScore($transcription),
            'clarity_score' => $this->calculateClarityScore($transcription),
            'hesitation_count' => $this->countHesitations($transcription),
            'interruption_analysis' => $this->analyzeInterruptions($transcription),
            'question_answering' => $this->analyzeQuestionAnswering($transcription)
        ];
        
        return $performance;
    }
    
    /**
     * Analyze speaking pace and rhythm
     */
    private function analyzeSpeakingPace($transcription)
    {
        $totalWords = count($transcription['words'] ?? []);
        $totalDuration = $transcription['duration'] ?? 1;
        
        $wordsPerMinute = ($totalWords / $totalDuration) * 60;
        
        // Analyze pace variations
        $paceVariations = $this->calculatePaceVariations($transcription);
        
        // Determine pace quality
        $paceScore = $this->scoreSpeakingPace($wordsPerMinute);
        
        return [
            'words_per_minute' => round($wordsPerMinute, 1),
            'pace_variations' => $paceVariations,
            'score' => $paceScore,
            'assessment' => $this->getPaceAssessment($wordsPerMinute),
            'recommendations' => $this->getPaceRecommendations($wordsPerMinute)
        ];
    }
    
    /**
     * Analyze filler words usage
     */
    private function analyzeFillerWords($transcription)
    {
        $text = $transcription['text'] ?? '';
        $fillerWords = ['um', 'uh', 'like', 'you know', 'so', 'actually', 'basically', 'literally'];
        
        $fillerCount = 0;
        $fillerDetails = [];
        
        foreach ($fillerWords as $filler) {
            $count = substr_count(strtolower($text), $filler);
            if ($count > 0) {
                $fillerDetails[$filler] = $count;
                $fillerCount += $count;
            }
        }
        
        $totalWords = str_word_count($text);
        $fillerPercentage = $totalWords > 0 ? ($fillerCount / $totalWords) * 100 : 0;
        
        return [
            'count' => $fillerCount,
            'percentage' => round($fillerPercentage, 2),
            'details' => $fillerDetails,
            'score' => $this->scoreFillerWords($fillerPercentage),
            'assessment' => $this->getFillerAssessment($fillerPercentage)
        ];
    }
    
    /**
     * Analyze response length patterns
     */
    private function analyzeResponseLength($transcription)
    {
        $responses = $this->extractResponses($transcription);
        
        if (empty($responses)) {
            return [
                'average' => 0,
                'shortest' => 0,
                'longest' => 0,
                'distribution' => [],
                'score' => 0.5
            ];
        }
        
        $lengths = array_map('str_word_count', $responses);
        
        return [
            'average' => round(array_sum($lengths) / count($lengths), 1),
            'shortest' => min($lengths),
            'longest' => max($lengths),
            'distribution' => $this->calculateLengthDistribution($lengths),
            'score' => $this->scoreResponseLength($lengths),
            'consistency' => $this->calculateLengthConsistency($lengths)
        ];
    }
    
    /**
     * Analyze vocabulary diversity
     */
    private function analyzeVocabularyDiversity($transcription)
    {
        $text = strtolower($transcription['text'] ?? '');
        $words = str_word_count($text, 1);
        
        $totalWords = count($words);
        $uniqueWords = count(array_unique($words));
        
        $diversity = $totalWords > 0 ? $uniqueWords / $totalWords : 0;
        
        return [
            'total_words' => $totalWords,
            'unique_words' => $uniqueWords,
            'diversity_ratio' => round($diversity, 3),
            'score' => $this->scoreDiversity($diversity),
            'assessment' => $this->getDiversityAssessment($diversity)
        ];
    }
    
    /**
     * Calculate engagement score
     */
    private function calculateEngagementScore($transcription)
    {
        $text = $transcription['text'] ?? '';
        $score = 0.5; // Base score
        
        // Positive indicators
        $positiveIndicators = [
            'excited', 'passionate', 'love', 'enjoy', 'interesting', 'amazing',
            'fantastic', 'great', 'excellent', 'wonderful'
        ];
        
        // Negative indicators
        $negativeIndicators = [
            'boring', 'tired', 'difficult', 'hard', 'struggle', 'problem',
            'issue', 'challenging', 'tough'
        ];
        
        $text = strtolower($text);
        $totalWords = str_word_count($text);
        
        foreach ($positiveIndicators as $indicator) {
            $score += (substr_count($text, $indicator) / max($totalWords, 1)) * 10;
        }
        
        foreach ($negativeIndicators as $indicator) {
            $score -= (substr_count($text, $indicator) / max($totalWords, 1)) * 5;
        }
        
        return max(0, min(1, $score));
    }
    
    /**
     * Calculate clarity score
     */
    private function calculateClarityScore($transcription)
    {
        $score = 0.7; // Base score
        
        // Factors that affect clarity
        $fillerWords = $this->analyzeFillerWords($transcription);
        $score -= ($fillerWords['percentage'] / 100) * 0.3;
        
        // Check for clear structure indicators
        $text = strtolower($transcription['text'] ?? '');
        $structureWords = ['first', 'second', 'then', 'next', 'finally', 'in conclusion'];
        
        foreach ($structureWords as $word) {
            if (strpos($text, $word) !== false) {
                $score += 0.05;
            }
        }
        
        return max(0, min(1, $score));
    }
    
    /**
     * Count hesitations and pauses
     */
    private function countHesitations($transcription)
    {
        $text = $transcription['text'] ?? '';
        $hesitationPatterns = [
            '/\b(um|uh|er|ah)\b/i',
            '/\.{2,}/',  // Multiple dots
            '/\s{2,}/',  // Multiple spaces
        ];
        
        $hesitationCount = 0;
        
        foreach ($hesitationPatterns as $pattern) {
            $hesitationCount += preg_match_all($pattern, $text);
        }
        
        return $hesitationCount;
    }
    
    /**
     * Analyze interruptions and overlaps
     */
    private function analyzeInterruptions($transcription)
    {
        $speakers = $transcription['speakers'] ?? [];
        $interruptions = 0;
        $overlaps = 0;
        
        for ($i = 1; $i < count($speakers); $i++) {
            $current = $speakers[$i];
            $previous = $speakers[$i - 1];
            
            // Check for speaker changes with minimal gap
            if ($current['speaker'] !== $previous['speaker']) {
                $gap = $current['start'] - $previous['end'];
                
                if ($gap < 0) {
                    $overlaps++;
                } elseif ($gap < 0.5) {
                    $interruptions++;
                }
            }
        }
        
        return [
            'interruptions' => $interruptions,
            'overlaps' => $overlaps,
            'total_speaker_changes' => count($speakers) - 1,
            'interruption_rate' => count($speakers) > 1 ? $interruptions / (count($speakers) - 1) : 0
        ];
    }
    
    /**
     * Analyze question answering patterns
     */
    private function analyzeQuestionAnswering($transcription)
    {
        $text = $transcription['text'] ?? '';
        
        // Find questions (simple heuristic)
        $questions = preg_match_all('/\?/', $text);
        
        // Find direct answers
        $directAnswers = preg_match_all('/\b(yes|no|definitely|absolutely|certainly)\b/i', $text);
        
        // Find elaborative responses
        $elaborativeWords = ['because', 'since', 'for example', 'specifically', 'in particular'];
        $elaborations = 0;
        
        foreach ($elaborativeWords as $word) {
            $elaborations += substr_count(strtolower($text), $word);
        }
        
        return [
            'questions_detected' => $questions,
            'direct_answers' => $directAnswers,
            'elaborations' => $elaborations,
            'answer_completeness' => $this->assessAnswerCompleteness($text),
            'relevance_score' => $this->assessAnswerRelevance($text)
        ];
    }
    
    /**
     * Helper methods for scoring and assessment
     */
    private function calculatePaceVariations($transcription)
    {
        // Simplified implementation
        return ['low' => 0.3, 'medium' => 0.5, 'high' => 0.2];
    }
    
    private function scoreSpeakingPace($wpm)
    {
        if ($wpm >= 140 && $wpm <= 180) return 1.0;
        if ($wpm >= 120 && $wpm <= 200) return 0.8;
        if ($wpm >= 100 && $wpm <= 220) return 0.6;
        return 0.4;
    }
    
    private function getPaceAssessment($wpm)
    {
        if ($wpm < 100) return 'Too slow - may lose audience attention';
        if ($wpm < 120) return 'Slightly slow - good for complex topics';
        if ($wpm <= 180) return 'Optimal pace - clear and engaging';
        if ($wpm <= 200) return 'Slightly fast - ensure clarity';
        return 'Too fast - may be hard to follow';
    }
    
    private function getPaceRecommendations($wpm)
    {
        if ($wpm < 120) {
            return ['Practice speaking with more energy', 'Use shorter pauses between words'];
        } elseif ($wpm > 180) {
            return ['Slow down for better comprehension', 'Add strategic pauses for emphasis'];
        }
        return ['Maintain current pace', 'Use pace variation for emphasis'];
    }
    
    private function scoreFillerWords($percentage)
    {
        if ($percentage <= 2) return 1.0;
        if ($percentage <= 5) return 0.8;
        if ($percentage <= 8) return 0.6;
        if ($percentage <= 12) return 0.4;
        return 0.2;
    }
    
    private function getFillerAssessment($percentage)
    {
        if ($percentage <= 2) return 'Excellent - minimal filler words';
        if ($percentage <= 5) return 'Good - acceptable level of filler words';
        if ($percentage <= 8) return 'Fair - noticeable filler words';
        return 'Poor - excessive filler words affecting clarity';
    }
    
    private function extractResponses($transcription)
    {
        // Simplified: split by speaker changes or long pauses
        $text = $transcription['text'] ?? '';
        return preg_split('/[.!?]+/', $text, -1, PREG_SPLIT_NO_EMPTY);
    }
    
    private function calculateLengthDistribution($lengths)
    {
        $short = count(array_filter($lengths, fn($l) => $l < 20));
        $medium = count(array_filter($lengths, fn($l) => $l >= 20 && $l < 50));
        $long = count(array_filter($lengths, fn($l) => $l >= 50));
        
        $total = count($lengths);
        
        return [
            'short' => $total > 0 ? round($short / $total, 2) : 0,
            'medium' => $total > 0 ? round($medium / $total, 2) : 0,
            'long' => $total > 0 ? round($long / $total, 2) : 0
        ];
    }
    
    private function scoreResponseLength($lengths)
    {
        $average = array_sum($lengths) / count($lengths);
        
        if ($average >= 30 && $average <= 60) return 1.0;
        if ($average >= 20 && $average <= 80) return 0.8;
        if ($average >= 15 && $average <= 100) return 0.6;
        return 0.4;
    }
    
    private function calculateLengthConsistency($lengths)
    {
        if (count($lengths) < 2) return 1.0;
        
        $mean = array_sum($lengths) / count($lengths);
        $variance = array_sum(array_map(fn($l) => pow($l - $mean, 2), $lengths)) / count($lengths);
        $stdDev = sqrt($variance);
        
        $cv = $mean > 0 ? $stdDev / $mean : 0; // Coefficient of variation
        
        return max(0, 1 - $cv); // Lower CV = higher consistency
    }
    
    private function scoreDiversity($diversity)
    {
        if ($diversity >= 0.7) return 1.0;
        if ($diversity >= 0.6) return 0.8;
        if ($diversity >= 0.5) return 0.6;
        if ($diversity >= 0.4) return 0.4;
        return 0.2;
    }
    
    private function getDiversityAssessment($diversity)
    {
        if ($diversity >= 0.7) return 'Excellent vocabulary diversity';
        if ($diversity >= 0.6) return 'Good vocabulary range';
        if ($diversity >= 0.5) return 'Adequate vocabulary diversity';
        if ($diversity >= 0.4) return 'Limited vocabulary range';
        return 'Very limited vocabulary diversity';
    }
    
    private function assessAnswerCompleteness($text)
    {
        // Simple heuristic based on text length and structure
        $wordCount = str_word_count($text);
        $sentences = preg_split('/[.!?]+/', $text, -1, PREG_SPLIT_NO_EMPTY);
        
        if ($wordCount > 100 && count($sentences) > 3) return 0.9;
        if ($wordCount > 50 && count($sentences) > 2) return 0.7;
        if ($wordCount > 20) return 0.5;
        return 0.3;
    }
    
    private function assessAnswerRelevance($text)
    {
        // Simplified relevance assessment
        $relevantWords = ['experience', 'project', 'team', 'challenge', 'solution', 'result'];
        $text = strtolower($text);
        $relevanceScore = 0.5;
        
        foreach ($relevantWords as $word) {
            if (strpos($text, $word) !== false) {
                $relevanceScore += 0.1;
            }
        }
        
        return min(1.0, $relevanceScore);
    }
}
