<?php

namespace Tests\Unit\Services\AI;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use App\Services\AI\InterviewAnalysisService;
use App\Services\AI\TranscriptionService;
use App\Services\AI\SentimentAnalysisService;
use App\Services\AI\KeywordExtractionService;
use App\Services\AI\PerformanceAnalysisService;

class InterviewAnalysisServiceTest extends TestCase
{
    private InterviewAnalysisService $service;
    private MockObject $pdoMock;
    private MockObject $transcriptionServiceMock;
    private MockObject $sentimentServiceMock;
    private MockObject $keywordServiceMock;
    private MockObject $performanceServiceMock;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->pdoMock = $this->createMock(\PDO::class);
        $this->transcriptionServiceMock = $this->createMock(TranscriptionService::class);
        $this->sentimentServiceMock = $this->createMock(SentimentAnalysisService::class);
        $this->keywordServiceMock = $this->createMock(KeywordExtractionService::class);
        $this->performanceServiceMock = $this->createMock(PerformanceAnalysisService::class);
        
        $this->service = new InterviewAnalysisService($this->pdoMock);
        
        // Inject mocked dependencies using reflection
        $this->injectMockDependencies();
    }

    public function testAnalyzeInterviewSuccess(): void
    {
        $interviewId = 123;
        $videoPath = '/path/to/video.mp4';
        
        // Mock transcription data
        $transcriptionData = [
            'text' => 'This is a sample interview transcription.',
            'words' => [
                ['word' => 'This', 'start' => 0.0, 'end' => 0.5],
                ['word' => 'is', 'start' => 0.5, 'end' => 0.7],
                ['word' => 'a', 'start' => 0.7, 'end' => 0.8],
            ],
            'duration' => 120.0,
            'language' => 'en'
        ];
        
        // Mock sentiment analysis data
        $sentimentData = [
            'overall_sentiment' => 0.7,
            'confidence_score' => 0.8,
            'emotions' => [
                'joy' => 0.6,
                'enthusiasm' => 0.7,
                'nervousness' => 0.2
            ]
        ];
        
        // Mock keyword extraction data
        $keywordData = [
            'technical_terms' => ['javascript', 'react', 'node.js'],
            'soft_skills' => ['communication', 'teamwork'],
            'industry_terms' => ['agile', 'scrum']
        ];
        
        // Mock performance analysis data
        $performanceData = [
            'speaking_pace' => [
                'words_per_minute' => 150,
                'score' => 0.8
            ],
            'filler_words' => [
                'count' => 5,
                'percentage' => 2.1
            ]
        ];
        
        // Set up mock expectations
        $this->transcriptionServiceMock
            ->expects($this->once())
            ->method('transcribe')
            ->willReturn($transcriptionData);
            
        $this->sentimentServiceMock
            ->expects($this->once())
            ->method('analyzeSentiment')
            ->with($transcriptionData['text'])
            ->willReturn($sentimentData);
            
        $this->keywordServiceMock
            ->expects($this->once())
            ->method('extractKeywords')
            ->with($transcriptionData['text'])
            ->willReturn($keywordData);
            
        $this->performanceServiceMock
            ->expects($this->once())
            ->method('analyzePerformance')
            ->with($transcriptionData)
            ->willReturn($performanceData);
        
        // Mock PDO statements for database operations
        $this->setupDatabaseMocks($interviewId);
        
        // Execute the test
        $result = $this->service->analyzeInterview($interviewId, $videoPath);
        
        // Assertions
        $this->assertIsArray($result);
        $this->assertArrayHasKey('transcription', $result);
        $this->assertArrayHasKey('sentiment', $result);
        $this->assertArrayHasKey('keywords', $result);
        $this->assertArrayHasKey('performance', $result);
        $this->assertArrayHasKey('insights', $result);
        
        $this->assertEquals($transcriptionData, $result['transcription']);
        $this->assertEquals($sentimentData, $result['sentiment']);
        $this->assertEquals($keywordData, $result['keywords']);
        $this->assertEquals($performanceData, $result['performance']);
        
        // Test insights generation
        $this->assertArrayHasKey('overall_score', $result['insights']);
        $this->assertArrayHasKey('strengths', $result['insights']);
        $this->assertArrayHasKey('areas_for_improvement', $result['insights']);
        $this->assertArrayHasKey('recommendations', $result['insights']);
    }

    public function testAnalyzeInterviewWithInvalidVideoPath(): void
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Failed to extract audio from video');
        
        $interviewId = 123;
        $invalidVideoPath = '/nonexistent/video.mp4';
        
        $this->service->analyzeInterview($interviewId, $invalidVideoPath);
    }

    public function testGetAnalysisReturnsExistingAnalysis(): void
    {
        $interviewId = 123;
        $expectedAnalysis = [
            'id' => 1,
            'interview_id' => $interviewId,
            'analysis_data' => json_encode([
                'overall_score' => 85,
                'sentiment' => ['overall_sentiment' => 0.7]
            ]),
            'status' => 'completed',
            'created_at' => '2024-01-01 12:00:00'
        ];
        
        $stmtMock = $this->createMock(\PDOStatement::class);
        $stmtMock->expects($this->once())
            ->method('execute')
            ->with([$interviewId]);
        $stmtMock->expects($this->once())
            ->method('fetch')
            ->with(\PDO::FETCH_ASSOC)
            ->willReturn($expectedAnalysis);
            
        $this->pdoMock->expects($this->once())
            ->method('prepare')
            ->willReturn($stmtMock);
        
        $result = $this->service->getAnalysis($interviewId);
        
        $this->assertIsArray($result);
        $this->assertEquals($interviewId, $result['interview_id']);
        $this->assertIsArray($result['analysis_data']);
        $this->assertEquals(85, $result['analysis_data']['overall_score']);
    }

    public function testGetAnalysisReturnsNullForNonexistentAnalysis(): void
    {
        $interviewId = 999;
        
        $stmtMock = $this->createMock(\PDOStatement::class);
        $stmtMock->expects($this->once())
            ->method('execute')
            ->with([$interviewId]);
        $stmtMock->expects($this->once())
            ->method('fetch')
            ->with(\PDO::FETCH_ASSOC)
            ->willReturn(false);
            
        $this->pdoMock->expects($this->once())
            ->method('prepare')
            ->willReturn($stmtMock);
        
        $result = $this->service->getAnalysis($interviewId);
        
        $this->assertFalse($result);
    }

    public function testCalculateOverallScore(): void
    {
        $sentiment = [
            'overall_sentiment' => 0.6,
            'confidence_score' => 0.8
        ];
        
        $performance = [
            'speaking_pace' => ['score' => 0.7],
            'engagement_score' => 0.75
        ];
        
        // Use reflection to test private method
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('calculateOverallScore');
        $method->setAccessible(true);
        
        $score = $method->invokeArgs($this->service, [$sentiment, $performance]);
        
        $this->assertIsFloat($score);
        $this->assertGreaterThanOrEqual(0, $score);
        $this->assertLessThanOrEqual(100, $score);
    }

    public function testGenerateInsights(): void
    {
        $transcription = [
            'text' => 'I am very confident about my JavaScript skills and React experience.',
            'duration' => 120
        ];
        
        $sentiment = [
            'overall_sentiment' => 0.8,
            'confidence_score' => 0.9,
            'emotions' => ['joy' => 0.7]
        ];
        
        $keywords = [
            'technical_terms' => ['javascript', 'react', 'node.js', 'html', 'css']
        ];
        
        $performance = [
            'speaking_pace' => ['score' => 0.8],
            'filler_words' => ['count' => 3],
            'response_length' => ['average' => 45]
        ];
        
        // Use reflection to test private method
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('generateInsights');
        $method->setAccessible(true);
        
        $insights = $method->invokeArgs($this->service, [$transcription, $sentiment, $keywords, $performance]);
        
        $this->assertIsArray($insights);
        $this->assertArrayHasKey('overall_score', $insights);
        $this->assertArrayHasKey('strengths', $insights);
        $this->assertArrayHasKey('areas_for_improvement', $insights);
        $this->assertArrayHasKey('recommendations', $insights);
        $this->assertArrayHasKey('communication_style', $insights);
        $this->assertArrayHasKey('technical_competency', $insights);
        $this->assertArrayHasKey('confidence_level', $insights);
        
        // Test that strengths are identified correctly
        $this->assertContains('Positive and enthusiastic communication', $insights['strengths']);
        $this->assertContains('Strong technical vocabulary', $insights['strengths']);
    }

    public function testAnalyzeCommunicationStyle(): void
    {
        $transcription = [
            'text' => 'I believe that my experience in software development has prepared me well for this role.'
        ];
        
        $sentiment = [
            'emotions' => ['joy' => 0.6],
            'confidence_score' => 0.8
        ];
        
        // Use reflection to test private method
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('analyzeCommunicationStyle');
        $method->setAccessible(true);
        
        $style = $method->invokeArgs($this->service, [$transcription, $sentiment]);
        
        $this->assertIsArray($style);
        $this->assertArrayHasKey('formality', $style);
        $this->assertArrayHasKey('assertiveness', $style);
        $this->assertArrayHasKey('enthusiasm', $style);
        $this->assertArrayHasKey('clarity', $style);
        $this->assertArrayHasKey('conciseness', $style);
        $this->assertArrayHasKey('primary_style', $style);
        
        $this->assertIsString($style['primary_style']);
    }

    public function testAnalyzeTechnicalCompetency(): void
    {
        $keywords = [
            'technical_terms' => ['javascript', 'react', 'node.js', 'mongodb', 'express']
        ];
        
        $transcription = [
            'text' => 'I have solved complex problems using React and built scalable applications with Node.js.'
        ];
        
        // Use reflection to test private method
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('analyzeTechnicalCompetency');
        $method->setAccessible(true);
        
        $competency = $method->invokeArgs($this->service, [$keywords, $transcription]);
        
        $this->assertIsArray($competency);
        $this->assertArrayHasKey('technical_terms_count', $competency);
        $this->assertArrayHasKey('domain_expertise', $competency);
        $this->assertArrayHasKey('problem_solving_indicators', $competency);
        $this->assertArrayHasKey('experience_indicators', $competency);
        $this->assertArrayHasKey('competency_level', $competency);
        
        $this->assertEquals(5, $competency['technical_terms_count']);
        $this->assertContains($competency['competency_level'], ['beginner', 'intermediate', 'advanced', 'expert']);
    }

    private function injectMockDependencies(): void
    {
        $reflection = new \ReflectionClass($this->service);
        
        $transcriptionProperty = $reflection->getProperty('transcriptionService');
        $transcriptionProperty->setAccessible(true);
        $transcriptionProperty->setValue($this->service, $this->transcriptionServiceMock);
        
        $sentimentProperty = $reflection->getProperty('sentimentService');
        $sentimentProperty->setAccessible(true);
        $sentimentProperty->setValue($this->service, $this->sentimentServiceMock);
        
        $keywordProperty = $reflection->getProperty('keywordService');
        $keywordProperty->setAccessible(true);
        $keywordProperty->setValue($this->service, $this->keywordServiceMock);
        
        $performanceProperty = $reflection->getProperty('performanceService');
        $performanceProperty->setAccessible(true);
        $performanceProperty->setValue($this->service, $this->performanceServiceMock);
    }

    private function setupDatabaseMocks(int $interviewId): void
    {
        $stmtMock = $this->createMock(\PDOStatement::class);
        $stmtMock->expects($this->atLeastOnce())
            ->method('execute')
            ->willReturn(true);
            
        $this->pdoMock->expects($this->atLeastOnce())
            ->method('prepare')
            ->willReturn($stmtMock);
    }

    /**
     * @dataProvider overallScoreDataProvider
     */
    public function testCalculateOverallScoreWithVariousInputs(
        array $sentiment,
        array $performance,
        float $expectedMinScore,
        float $expectedMaxScore
    ): void {
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('calculateOverallScore');
        $method->setAccessible(true);
        
        $score = $method->invokeArgs($this->service, [$sentiment, $performance]);
        
        $this->assertGreaterThanOrEqual($expectedMinScore, $score);
        $this->assertLessThanOrEqual($expectedMaxScore, $score);
    }

    public function overallScoreDataProvider(): array
    {
        return [
            'high_performance' => [
                ['overall_sentiment' => 0.8, 'confidence_score' => 0.9],
                ['speaking_pace' => ['score' => 0.9], 'engagement_score' => 0.8],
                80.0,
                100.0
            ],
            'medium_performance' => [
                ['overall_sentiment' => 0.5, 'confidence_score' => 0.6],
                ['speaking_pace' => ['score' => 0.6], 'engagement_score' => 0.5],
                40.0,
                70.0
            ],
            'low_performance' => [
                ['overall_sentiment' => 0.2, 'confidence_score' => 0.3],
                ['speaking_pace' => ['score' => 0.3], 'engagement_score' => 0.2],
                0.0,
                40.0
            ]
        ];
    }

    public function testUpdateAnalysisStatus(): void
    {
        $interviewId = 123;
        $status = 'processing';
        $message = 'Starting AI analysis...';
        
        $stmtMock = $this->createMock(\PDOStatement::class);
        $stmtMock->expects($this->once())
            ->method('execute')
            ->with([$interviewId, $status, $message])
            ->willReturn(true);
            
        $this->pdoMock->expects($this->once())
            ->method('prepare')
            ->willReturn($stmtMock);
        
        // Use reflection to test private method
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('updateAnalysisStatus');
        $method->setAccessible(true);
        
        // Should not throw any exceptions
        $method->invokeArgs($this->service, [$interviewId, $status, $message]);
        
        $this->assertTrue(true); // If we reach here, the method executed successfully
    }
}
