/** Safe validation details; submitted input and server internals are deliberately omitted. */
export interface ValidationIssue {
  location: Array<string | number>
  message: string
  type: string
}
