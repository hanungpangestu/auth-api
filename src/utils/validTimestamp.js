const SIGNATURE_TIMELIMIT = parseInt(process.env.SIGNATURE_TIMELIMIT || "60000"); // in milliseconds
const SIGNATURE_ALLOW_FUTURE = parseInt(process.env.SIGNATURE_ALLOW_FUTURE || "30000"); // in milliseconds

/**
 *  Validates the timestamp format and checks if it is within the allowed time limit.
 * @param {number|string} timestamp - The timestamp to validate.
 * @return {boolean} - Returns true if the timestamp is valid and within the time limit, otherwise false.
 */

function isValidTimestamp(timestamp) {
  const numericTimestamp = Number(timestamp);
  if (isNaN(numericTimestamp)) return false;

  const dateProcessed = Math.trunc(numericTimestamp / 1000);
  const expected = 1000 * dateProcessed + (dateProcessed % 997);

  const now = Date.now();
  const diff = now - numericTimestamp;

  const isValidFormat = numericTimestamp === expected;
  const isNotExpired = diff >= -SIGNATURE_ALLOW_FUTURE && diff <= SIGNATURE_TIMELIMIT;

  if (process.env.NODE_ENV == "development" || process.env.NODE_ENV == "dev") {
    console.log(`\n[Timestamp Check]`);
    console.log(`  Timestamp: ${numericTimestamp}`);
    console.log(`  Expected : ${expected}`);
    console.log(`  Diff     : ${diff}ms`);
    console.log(`  Valid?   : ${isValidFormat && isNotExpired}`);
  }

  return isValidFormat && isNotExpired;
}

module.exports = {
  isValidTimestamp,
};
