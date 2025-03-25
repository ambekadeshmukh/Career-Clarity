/**
 * Job Analyzer Service
 * 
 * Uses OpenAI GPT to analyze job descriptions for signs of "ghost jobs"
 * and other inauthenticity markers.
 */

const { Configuration, OpenAIApi } = require('openai');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Initialize AWS services
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

/**
 * Job Analysis Prompt Template
 */
const JOB_ANALYSIS_PROMPT = `
You are an expert job market analyst. Analyze this job description for signs of a "ghost job" (posted without genuine hiring intent). Look for:

1. Vague or generic language lacking specifics
2. Unrealistic combination of requirements (e.g. 10 years experience with 3-year-old technology)
3. Multiple disparate skills that wouldn't typically be found in one role
4. Missing salary/compensation information
5. Extremely broad role responsibilities
6. Inconsistencies in required experience levels
7. Language suggesting non-immediate hiring ("building a pool of candidates")

Job Description:
"{jobDescription}"

Job Title: "{jobTitle}"
Company: "{company}"
Location: "{location}"

Provide your analysis in the following JSON format:
{
  "authenticityScore": 1-10,
  "redFlags": ["List specific concerns"],
  "greenFlags": ["List positive authenticity signals"],
  "reasoning": "Brief explanation of your evaluation"
}
`;

/**
 * Analyzes a job description using GPT-3.5 to detect signs of 
 * potential "ghost jobs" or inauthentic listings
 * 
 * @param {Object} jobData - Job description and metadata
 * @returns {Object} Analysis results with authenticity score and reasoning
 */
exports.analyzeJob = async (jobData) => {
  try {
    const { jobTitle, company, location, jobDescription } = jobData;
    
    // Create prompt with job data
    const prompt = JOB_ANALYSIS_PROMPT
      .replace('{jobDescription}', jobDescription)
      .replace('{jobTitle}', jobTitle)
      .replace('{company}', company)
      .replace('{location}', location);
    
    // Call OpenAI API
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a job market expert analyzing job postings for authenticity."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent/predictable results
      max_tokens: 800,
    });
    
    // Extract and parse JSON response
    const analysisText = response.data.choices[0].message.content.trim();
    const analysisJson = JSON.parse(analysisText);
    
    // Store analysis in DynamoDB
    const analysisId = uuidv4();
    const timestamp = new Date().toISOString();
    
    await dynamoDb.put({
      TableName: process.env.JOB_ANALYSES_TABLE,
      Item: {
        id: analysisId,
        jobTitle,
        company,
        location,
        authenticityScore: analysisJson.authenticityScore,
        redFlags: analysisJson.redFlags,
        greenFlags: analysisJson.greenFlags,
        reasoning: analysisJson.reasoning,
        timestamp,
        userId: jobData.userId || 'anonymous'
      }
    }).promise();
    
    // Store full job description and analysis in S3 for later reference
    await s3.putObject({
      Bucket: process.env.JOB_DATA_BUCKET,
      Key: `job-analyses/${analysisId}.json`,
      Body: JSON.stringify({
        ...jobData,
        analysis: analysisJson,
        timestamp
      }),
      ContentType: 'application/json'
    }).promise();
    
    return {
      id: analysisId,
      ...analysisJson,
      timestamp
    };
  } catch (error) {
    console.error('Error analyzing job:', error);
    
    // Handle JSON parsing errors from the AI response
    if (error.name === 'SyntaxError') {
      throw new Error('Failed to parse AI response. Please try again.');
    }
    
    throw error;
  }
};

/**
 * Get analysis history for a user
 * 
 * @param {string} userId - User ID
 * @returns {Array} List of previous job analyses
 */
exports.getUserAnalysisHistory = async (userId) => {
  const params = {
    TableName: process.env.JOB_ANALYSES_TABLE,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ScanIndexForward: false // Get newest first
  };
  
  const result = await dynamoDb.query(params).promise();
  return result.Items;
};

/**
 * Get detailed analysis by ID
 * 
 * @param {string} analysisId - Analysis ID
 * @returns {Object} Complete analysis with job description
 */
exports.getAnalysisById = async (analysisId) => {
  try {
    // First check DynamoDB for basic info
    const dbParams = {
      TableName: process.env.JOB_ANALYSES_TABLE,
      Key: {
        id: analysisId
      }
    };
    
    const dbResult = await dynamoDb.get(dbParams).promise();
    
    if (!dbResult.Item) {
      throw new Error('Analysis not found');
    }
    
    // Get full details from S3
    const s3Result = await s3.getObject({
      Bucket: process.env.JOB_DATA_BUCKET,
      Key: `job-analyses/${analysisId}.json`
    }).promise();
    
    const fullAnalysis = JSON.parse(s3Result.Body.toString());
    
    return fullAnalysis;
  } catch (error) {
    console.error('Error retrieving analysis:', error);
    throw error;
  }
};