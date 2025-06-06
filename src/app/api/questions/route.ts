import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CACHE_FILE = path.resolve("searchCache.json");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company")?.toLowerCase();

  if (!company) {
    return NextResponse.json(
      { error: "Missing company parameter.", questions: [] },
      { status: 400 }
    );
  }

  // Load cache
  let fileCache: Record<string, any> = {};
  try {
    const file = await fs.readFile(CACHE_FILE, "utf-8");
    fileCache = JSON.parse(file);
    if (fileCache[company]) {
      return NextResponse.json(fileCache[company]);
    }
  } catch {
    // Ignore if file doesn't exist
  }

  try {
    // Step 1: Get employerId from search
    const searchRes = await fetch(
      `https://glassdoor-real-time.p.rapidapi.com/companies/search?query=${encodeURIComponent(company)}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY!,
          "X-RapidAPI-Host": "glassdoor-real-time.p.rapidapi.com",
        },
      }
    );

    if (!searchRes.ok) {
      console.error("🚨 Search API Error:", searchRes.status, searchRes.statusText);
      return NextResponse.json({ 
        error: `API returned ${searchRes.status}: ${searchRes.statusText}`, 
        questions: [],
        employer: company,
        hasCompanyInfo: false
      });
    }

    const searchData = await searchRes.json();
    
    console.log("🔍 Search Response Status:", searchRes.status);
    console.log("🔍 Search Response Structure:", {
      hasData: !!searchData.data,
      hasEmployerResults: !!searchData.data?.employerResults,
      resultsLength: searchData.data?.employerResults?.length || 0,
      status: searchData.status,
      message: searchData.message
    });
    
    // Check for API errors
    if (!searchData.status || searchData.error) {
      console.log("🚨 API Error:", searchData.error || "API returned status: false");
      return NextResponse.json({ 
        error: "API Error: " + (searchData.error || "Request failed"), 
        questions: [],
        employer: company,
        hasCompanyInfo: false
      });
    }
    
    // Extract employer results - handle different possible structures
    const results = searchData.data?.employerResults || [];
    
    if (results.length === 0) {
      return NextResponse.json({ 
        error: "No companies found for search query", 
        questions: [],
        employer: company,
        hasCompanyInfo: false,
        searchedFor: company
      });
    }

    // Get the first matching result
    const firstResult = results[0];
    const employerId = firstResult.employer?.id;
    const companyName = firstResult.employer?.name || firstResult.employer?.shortName || company;
    
    console.log("🔍 Found Company:", companyName, "ID:", employerId);

    if (!employerId) {
      return NextResponse.json({ 
        error: "Employer ID not found in search results", 
        questions: [],
        employer: companyName,
        hasCompanyInfo: true,
        debug: {
          firstResultKeys: Object.keys(firstResult),
          employerKeys: firstResult.employer ? Object.keys(firstResult.employer) : null
        }
      });
    }

    // Step 2: Get interview data using the employerId
    const interviewRes = await fetch(
      `https://glassdoor-real-time.p.rapidapi.com/companies/interviews?companyId=${employerId}&limit=20`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY!,
          "X-RapidAPI-Host": "glassdoor-real-time.p.rapidapi.com",
        },
      }
    );

    if (!interviewRes.ok) {
      console.error("🚨 Interview API Error:", interviewRes.status, interviewRes.statusText);
      return NextResponse.json({ 
        error: `Interview API returned ${interviewRes.status}: ${interviewRes.statusText}`, 
        questions: [],
        employer: companyName,
        hasCompanyInfo: true
      });
    }

    const interviewData = await interviewRes.json();
    
    // Debug: Log the full structure to understand the response
    console.log("🔍 Full interview response keys:", Object.keys(interviewData));
    console.log("🔍 Interview data structure:", {
      hasStatus: !!interviewData.status,
      hasMessage: !!interviewData.message,
      hasInterviews: !!interviewData.interviews,
      hasData: !!interviewData.data,
      topLevelKeys: Object.keys(interviewData)
    });
    
    // Try multiple possible paths for the interviews data
    let interviews = [];
    
    // Path 1: Direct interviews array
    if (interviewData.interviews && Array.isArray(interviewData.interviews)) {
      interviews = interviewData.interviews;
      console.log("🔍 Found interviews in direct path, count:", interviews.length);
    }
    // Path 2: Nested in data
    else if (interviewData.data?.interviews && Array.isArray(interviewData.data.interviews)) {
      interviews = interviewData.data.interviews;
      console.log("🔍 Found interviews in data.interviews path, count:", interviews.length);
    }
    // Path 3: Check if the entire response IS the interview data structure
    else if (interviewData.employer && interviewData.interviews && Array.isArray(interviewData.interviews)) {
      interviews = interviewData.interviews;
      console.log("🔍 Found interviews in root structure, count:", interviews.length);
    }
    // Path 4: Check for employerInterviews
    else if (interviewData.data?.employerInterviews) {
      const employerInterviews = interviewData.data.employerInterviews;
      if (Array.isArray(employerInterviews)) {
        interviews = employerInterviews;
      } else if (employerInterviews.interviews && Array.isArray(employerInterviews.interviews)) {
        interviews = employerInterviews.interviews;
      }
      console.log("🔍 Found interviews in employerInterviews path, count:", interviews.length);
    }
    
    console.log("🔍 Final interviews array length:", interviews.length);
    console.log("🔍 Sample interview keys:", interviews[0] ? Object.keys(interviews[0]) : "No interviews found");
    
    if (interviews.length === 0) {
      console.log("🔍 No interviews found, trying alternative endpoints...");
      
      // Try to get company overview which might have interview summary
      try {
        const overviewRes = await fetch(
          `https://glassdoor-real-time.p.rapidapi.com/companies/overview?companyId=${employerId}`,
          {
            method: "GET",
            headers: {
              "X-RapidAPI-Key": process.env.RAPIDAPI_KEY!,
              "X-RapidAPI-Host": "glassdoor-real-time.p.rapidapi.com",
            },
          }
        );
        
        if (overviewRes.ok) {
          const overviewData = await overviewRes.json();
          console.log("🔍 Overview data available:", !!overviewData.data);
          
          // Return basic company info with fallback values
          return NextResponse.json({ 
            employer: companyName,
            difficulty: "Not specified",
            experience: "Not specified", 
            jobTitle: "Various positions",
            outcome: "Not specified",
            process: "Interview process information not available",
            questions: [],
            hasCompanyInfo: true,
            interviewCount: 0,
            note: "Company found but no interview details are publicly available"
          });
        }
      } catch (overviewError) {
        console.log("🔍 Overview endpoint also failed:", overviewError);
      }
      
      // Final fallback
      return NextResponse.json({ 
        employer: companyName,
        difficulty: "Not specified",
        experience: "Not specified", 
        jobTitle: "Various positions",
        outcome: "Not specified",
        process: "Interview process information not available",
        questions: [],
        hasCompanyInfo: true,
        interviewCount: 0,
        note: "This company may not have public interview data available",
        error: "No interview data available for this company"
      });
    }

    // Extract questions from interviews
    let allQuestions: string[] = [];
    let sampleInterview = interviews[0]; // Use first interview for other details

    console.log("🔍 Processing interviews for questions...");
    
    // Define a type for interview objects
    type Interview = {
      difficulty?: string;
      experience?: string;
      jobTitle?: { text?: string } | string;
      outcome?: string;
      processDescription?: string;
      userQuestions?: Array<{ question?: string; text?: string; content?: string } | string>;
    };

    // Collect statistics from all interviews
    const difficulties = interviews.map((i: Interview) => i.difficulty).filter(Boolean);
    const experiences = interviews.map((i: Interview) => i.experience).filter(Boolean);
    const jobTitles = interviews.map((i: Interview) => 
      typeof i.jobTitle === 'object' && i.jobTitle?.text ? i.jobTitle.text : i.jobTitle
    ).filter(Boolean);
    const outcomes = interviews.map((i: Interview) => i.outcome).filter(Boolean);
    
    // Get most common values
    const getMostCommon = (arr: string[]) => {
      if (arr.length === 0) return "Not specified";
      const counts = arr.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return Object.entries(counts).sort(([,a], [,b]) => b - a)[0][0];
    };

    // Process all interviews for questions
    interviews.forEach((interview: any, index: number) => {
      console.log(`🔍 Interview ${index + 1}:`, {
        hasUserQuestions: !!interview.userQuestions,
        userQuestionsType: typeof interview.userQuestions,
        userQuestionsLength: interview.userQuestions?.length || 0,
        isArray: Array.isArray(interview.userQuestions)
      });
      
      if (interview.userQuestions && Array.isArray(interview.userQuestions)) {
        const questions = interview.userQuestions
          .map((q: any) => {
            // Log the structure of each question
            console.log("🔍 Question structure:", typeof q, Object.keys(q || {}));
            return q.question || q.text || q.content || q;
          })
          .filter((q: string) => q && typeof q === 'string' && q.trim().length > 10);
        
        console.log(`🔍 Extracted ${questions.length} questions from interview ${index + 1}`);
        allQuestions.push(...questions);
      }
      
      // Also check if there are questions in the processDescription
      if (interview.processDescription && typeof interview.processDescription === 'string') {
        // Look for questions in the process description (they often contain "?" marks)
        const processQuestions = interview.processDescription
          .split(/[.!]/)
          .filter((sentence: string) => sentence.includes('?'))
          .map((q: string) => q.trim())
          .filter((q: string) => q.length > 15); // Only meaningful questions
        
        if (processQuestions.length > 0) {
          console.log(`🔍 Found ${processQuestions.length} questions in process description`);
          allQuestions.push(...processQuestions);
        }
      }
    });

    // Remove duplicates and limit to 20 questions
    const uniqueQuestions = [...new Set(allQuestions)].slice(0, 20);

    console.log("🔍 Total extracted questions:", uniqueQuestions.length);
    console.log("🔍 Sample questions:", uniqueQuestions.slice(0, 3));

    // Get the longest process description for better context
    const processDescriptions = interviews
      .map((i: { processDescription?: string }) => i.processDescription)
      .filter(Boolean)
      .sort((a: string, b: string) => b.length - a.length);

    const result = {
      employer: companyName,
      difficulty: getMostCommon(difficulties),
      experience: getMostCommon(experiences), 
      jobTitle: getMostCommon(jobTitles),
      outcome: getMostCommon(outcomes),
      process: processDescriptions[0] || "No detailed process description available",
      questions: uniqueQuestions,
      interviewCount: interviews.length,
      hasCompanyInfo: true,
      // Additional metadata
      totalInterviews: interviews.length,
      questionsFound: uniqueQuestions.length
    };

    // Cache the result
    fileCache[company] = result;
    try {
      await fs.writeFile(CACHE_FILE, JSON.stringify(fileCache, null, 2));
    } catch (cacheError) {
      console.warn("Failed to write cache:", cacheError);
    }

    return NextResponse.json(result);

  } catch (err: any) {
    console.error("❌ Interview fetch error:", err?.message || err);
    return NextResponse.json({ 
      error: "Request failed", 
      questions: [],
      employer: company,
      difficulty: "Not specified",
      experience: "Not specified",
      jobTitle: "Various positions",
      outcome: "Not specified",
      process: "Error occurred while fetching interview data",
      hasCompanyInfo: false,
      interviewCount: 0,
      errorMessage: err?.message || "Unknown error",
      stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    });
  }
}