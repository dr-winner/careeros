import { describe, expect, it } from "vitest";
import {
  dedupeJobsByTitleAndCompany,
  detectSeniority,
  filterJobs,
  getCountry,
  getWorkMode,
  paginateJobs,
  parseSalary,
  type FilterableJob,
} from "./jobs-utils";

describe("jobs-utils", () => {
  describe("detectSeniority", () => {
    it("returns Entry-Level for junior-like roles", () => {
      expect(detectSeniority("Junior Frontend Developer")).toBe("Entry-Level");
      expect(detectSeniority("Graduate Software Engineer")).toBe("Entry-Level");
      expect(detectSeniority("Marketing Intern")).toBe("Entry-Level");
    });

    it("returns Senior for senior and leadership roles", () => {
      expect(detectSeniority("Senior Backend Engineer")).toBe("Senior");
      expect(detectSeniority("Lead Product Designer")).toBe("Senior");
      expect(detectSeniority("Engineering Manager")).toBe("Senior");
      expect(detectSeniority("Chief Technology Officer")).toBe("Senior");
    });

    it("defaults to Mid-Level when no keyword matches", () => {
      expect(detectSeniority("Software Developer")).toBe("Mid-Level");
    });
  });

  describe("getWorkMode", () => {
    it("returns Remote when explicitly remote", () => {
      expect(getWorkMode(true, "full-time")).toBe("Remote");
      expect(getWorkMode(false, "remote")).toBe("Remote");
    });

    it("maps contract, part-time, hybrid, and on-site values", () => {
      expect(getWorkMode(false, "contract")).toBe("Contract");
      expect(getWorkMode(false, "part-time")).toBe("Part-time");
      expect(getWorkMode(false, "hybrid")).toBe("Hybrid");
      expect(getWorkMode(false, "on-site")).toBe("On-site");
      expect(getWorkMode(false, "onsite")).toBe("On-site");
    });

    it("defaults to Full-time", () => {
      expect(getWorkMode(false, "permanent")).toBe("Full-time");
      expect(getWorkMode()).toBe("Full-time");
    });
  });

  describe("parseSalary", () => {
    it("returns an empty object when no salary is provided", () => {
      expect(parseSalary()).toEqual({});
      expect(parseSalary("")).toEqual({});
    });

    it("parses salary ranges with thousands shorthand", () => {
      expect(parseSalary("50k - 80k")).toEqual({ min: 50000, max: 80000 });
    });

    it("parses salary values with millions shorthand", () => {
      expect(parseSalary("1.5m - 2m")).toEqual({ min: 1500000, max: 2000000 });
    });

    it("parses a single value", () => {
      expect(parseSalary("120000")).toEqual({ min: 120000 });
    });
  });

  describe("getCountry", () => {
    it("detects African locations", () => {
      expect(getCountry("rise", "Accra, Ghana")).toBe("GH");
      expect(getCountry("rise", "Lagos, Nigeria")).toBe("NG");
      expect(getCountry("rise", "Cape Town, South Africa")).toBe("ZA");
      expect(getCountry("rise", "Nairobi, Kenya")).toBe("KE");
    });

    it("detects North American locations", () => {
      expect(getCountry("adzuna", "Toronto, Canada")).toBe("CA");
      expect(getCountry("adzuna", "Vancouver")).toBe("CA");
      expect(getCountry("adzuna", "New York, United States")).toBe("US");
      expect(getCountry("adzuna", "San Francisco, CA")).toBe("US");
    });

    it("detects European and APAC locations", () => {
      expect(getCountry("adzuna", "London, United Kingdom")).toBe("GB");
      expect(getCountry("adzuna", "Sydney, Australia")).toBe("AU");
      expect(getCountry("adzuna", "Bangalore, India")).toBe("IN");
      expect(getCountry("adzuna", "Berlin, Germany")).toBe("DE");
      expect(getCountry("arbeitnow", "Amsterdam")).toBe("EU");
    });

    it("detects region fallbacks from source", () => {
      expect(getCountry("remotive", "Remote")).toBe("GLOBAL");
      expect(getCountry("remoteok", "Worldwide")).toBe("GLOBAL");
      expect(getCountry("themuse", "New York")).toBe("US");
    });

    it("falls back to ZA when no rule matches", () => {
      expect(getCountry("unknown", "Cape Town")).toBe("ZA");
    });
  });

  describe("filterJobs", () => {
    const jobs: FilterableJob[] = [
      {
        title: "Frontend Developer",
        companyName: "Acme",
        location: "Accra, Ghana",
        country: "AFRICA",
        workMode: "Remote",
        seniorityLevel: "Entry-Level",
      },
      {
        title: "Backend Engineer",
        companyName: "Beta",
        location: "Nairobi, Kenya",
        country: "AFRICA",
        workMode: "Contract",
        seniorityLevel: "Senior",
      },
      {
        title: "Product Designer",
        companyName: "Gamma",
        location: "Berlin, Germany",
        country: "EU",
        workMode: "Hybrid",
        seniorityLevel: "Mid-Level",
      },
    ];

    it("filters by search term", () => {
      expect(filterJobs(jobs, { search: "frontend" })).toEqual([jobs[0]]);
      expect(filterJobs(jobs, { search: "beta" })).toEqual([jobs[1]]);
    });

    it("filters by location and country", () => {
      expect(filterJobs(jobs, { location: "ghana" })).toEqual([jobs[0]]);
      expect(filterJobs(jobs, { location: "eu" })).toEqual([jobs[2]]);
    });

    it("filters by seniority", () => {
      expect(filterJobs(jobs, { seniority: "Senior" })).toEqual([jobs[1]]);
    });

    it("filters by work mode", () => {
      expect(filterJobs(jobs, { workMode: "Remote" })).toEqual([jobs[0]]);
      expect(filterJobs(jobs, { workMode: "Contract" })).toEqual([jobs[1]]);
      expect(filterJobs(jobs, { workMode: "Hybrid" })).toEqual([jobs[2]]);
    });

    it("supports combining filters", () => {
      expect(
        filterJobs(jobs, {
          search: "designer",
          location: "berlin",
          workMode: "Hybrid",
          seniority: "Mid-Level",
        }),
      ).toEqual([jobs[2]]);
    });
  });

  describe("dedupeJobsByTitleAndCompany", () => {
    it("removes duplicate jobs by normalized title and company", () => {
      const jobs: FilterableJob[] = [
        {
          title: "Frontend Developer",
          companyName: "Acme",
          location: "Accra",
          country: "AFRICA",
          workMode: "Remote",
          seniorityLevel: "Entry-Level",
        },
        {
          title: " frontend developer ",
          companyName: " acme ",
          location: "Remote",
          country: "GLOBAL",
          workMode: "Remote",
          seniorityLevel: "Entry-Level",
        },
        {
          title: "Backend Engineer",
          companyName: "Beta",
          location: "Nairobi",
          country: "AFRICA",
          workMode: "Contract",
          seniorityLevel: "Senior",
        },
      ];

      expect(dedupeJobsByTitleAndCompany(jobs)).toEqual([jobs[0], jobs[2]]);
    });
  });

  describe("paginateJobs", () => {
    const jobs = Array.from({ length: 45 }, (_, index) => ({
      id: `job-${index + 1}`,
    }));

    it("returns the correct items and pagination metadata", () => {
      const result = paginateJobs(jobs, 2, 20);

      expect(result.items).toHaveLength(20);
      expect(result.items[0]).toEqual({ id: "job-21" });
      expect(result.items[19]).toEqual({ id: "job-40" });
      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it("normalizes invalid page values", () => {
      const result = paginateJobs(jobs, 0, 20);

      expect(result.pagination.page).toBe(1);
      expect(result.items[0]).toEqual({ id: "job-1" });
    });
  });
});
