import type { CurriculumVersion, VersionsConfig } from "@/types";
import versionsData from "@/data/versions.json";

// Load versions config from JSON file
const config: VersionsConfig = versionsData as VersionsConfig;

/**
 * VersionService - Manages curriculum version metadata
 */
export class VersionService {
  /**
   * Get all available curriculum versions
   */
  getVersions(): CurriculumVersion[] {
    return config.versions;
  }

  /**
   * Get only active versions (those with data imported)
   */
  getActiveVersions(): CurriculumVersion[] {
    return config.versions.filter((v) => v.isActive);
  }

  /**
   * Get the default version ID
   */
  getDefaultVersion(): string {
    return config.defaultVersion;
  }

  /**
   * Get a specific version by ID
   */
  getVersion(id: string): CurriculumVersion | null {
    return config.versions.find((v) => v.id === id) || null;
  }

  /**
   * Check if a version is active (has data imported)
   */
  isVersionActive(id: string): boolean {
    const version = this.getVersion(id);
    return version?.isActive ?? false;
  }

  /**
   * Get the database filename for a version
   */
  getDbFile(id: string): string | null {
    const version = this.getVersion(id);
    return version?.dbFile || null;
  }

  /**
   * Validate that a version ID exists
   */
  isValidVersion(id: string): boolean {
    return config.versions.some((v) => v.id === id);
  }

  /**
   * Check if version selector should be shown
   * (only show when more than one active version exists)
   */
  shouldShowVersionSelector(): boolean {
    return this.getActiveVersions().length > 1;
  }
}

// Singleton instance
export const versionService = new VersionService();

// Convenience exports
export function getVersions(): CurriculumVersion[] {
  return versionService.getVersions();
}

export function getActiveVersions(): CurriculumVersion[] {
  return versionService.getActiveVersions();
}

export function getDefaultVersion(): string {
  return versionService.getDefaultVersion();
}

export function getVersion(id: string): CurriculumVersion | null {
  return versionService.getVersion(id);
}

export function isVersionActive(id: string): boolean {
  return versionService.isVersionActive(id);
}

export function getDbFile(id: string): string | null {
  return versionService.getDbFile(id);
}

export function isValidVersion(id: string): boolean {
  return versionService.isValidVersion(id);
}

export function shouldShowVersionSelector(): boolean {
  return versionService.shouldShowVersionSelector();
}
