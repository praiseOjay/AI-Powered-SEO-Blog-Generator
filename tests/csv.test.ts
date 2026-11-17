import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseCsv, parseRecords } from '../server/utils/csv'

describe('parseRecords', () => {
  it('handles quotes, escaped quotes, embedded commas/newlines and CRLF', () => {
    expect(parseRecords('a,b\r\n"x, y","say ""hi"""\r\n"multi\nline",z\r\n\r\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"'], ['multi\nline', 'z']])
  })
  it('handles a missing trailing newline and BOM', () => { expect(parseRecords('﻿a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]) })
})
describe('real dataset', () => {
  it('parses all 100 fintech rows with 9 columns', () => {
    const c = parseCsv(readFileSync('data/fintech.csv', 'utf8'))
    expect(c.rows).toHaveLength(100); expect(c.headers).toHaveLength(9)
    expect(c.rows[0][5]).toBe('£30,314,247')
  })
})
