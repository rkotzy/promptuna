/**
 * Version constants shared across core and validation packages
 */
export const SDK_VERSION = '0.1.0';
export const SUPPORTED_SCHEMA_VERSIONS = ['1.0.0'];

/**
 * Get the major version from a semantic version string
 */
export function getMajorVersion(version: string): number {
  const match = version.match(/^(\d+)\.\d+\.\d+$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Check if a schema version is supported
 */
export function isSchemaVersionSupported(version: string): boolean {
  const major = getMajorVersion(version);
  return SUPPORTED_SCHEMA_VERSIONS.some(
    supported => getMajorVersion(supported) === major
  );
}
