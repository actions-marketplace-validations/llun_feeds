import anyTest, { TestFn } from 'ava'
import { knex, Knex } from 'knex'
import sinon from 'sinon'
import {
  createTables,
  deleteCategory,
  deleteEntry,
  deleteSite,
  deleteSiteCategory,
  hash,
  insertCategory,
  insertEntry,
  insertSite
} from './database'
import { Entry, Site } from './parsers'

const test = anyTest as TestFn<{
  db: Knex
  fixtures: {
    site: Site
    entry: Entry
    entryWithoutDate: Entry
  }
}>

test.beforeEach(async (t) => {
  const db = knex({
    client: 'sqlite3',
    connection: ':memory:',
    useNullAsDefault: true
  })

  const fixtureEntry: Entry = {
    title: 'Sample entry',
    link: 'https://www.llun.me/posts/2021-12-30-2021/',
    author: 'llun',
    content: 'Content',
    date: Date.now()
  }
  const fixtureEntryWithoutDate: Entry = {
    title: 'Sample entry',
    link: 'https://www.llun.me/posts/2021-12-30-2021/',
    author: 'llun',
    content: 'Content',
    date: null
  }
  const fixtureSite: Site = {
    title: 'Demo Site',
    link: 'https://llun.dev',
    description: 'Sample site',
    updatedAt: Date.now(),
    generator: 'Test',
    entries: [fixtureEntry]
  }

  await createTables(db)
  t.context = {
    db,
    fixtures: {
      site: fixtureSite,
      entry: fixtureEntry,
      entryWithoutDate: fixtureEntryWithoutDate
    }
  }
})

test('#insertCategory', async (t) => {
  const { db } = t.context
  await insertCategory(db, 'category1')
  const count = await db('Categories').count('* as total').first()
  t.is(count.total, 1)

  const first = await db('Categories').first()
  t.is(first.name, 'category1')
})

test('#deleteCategory', async (t) => {
  const { db, fixtures } = t.context
  const { site, entry } = fixtures

  await insertCategory(db, 'category1')
  await insertCategory(db, 'category2')
  await insertSite(db, 'category1', site)
  await insertSite(db, 'category2', site)

  const siteKey = hash(site.title)
  await insertEntry(db, siteKey, site.title, 'category1', entry)
  await insertEntry(db, siteKey, site.title, 'category2', entry)

  await deleteCategory(db, 'category2')

  const entriesCount = await db('Entries').count('* as total').first()
  const sitesCount = await db('Sites').count('* as total').first()
  const entryCategoriesCount = await db('EntryCategories')
    .count('* as total')
    .first()
  const siteCategoriesCount = await db('SiteCategories')
    .count('* as total')
    .first()
  const categoriesCount = await db('Categories').count('* as total').first()

  t.is(entriesCount.total, 1)
  t.is(sitesCount.total, 1)
  t.is(entryCategoriesCount.total, 1)
  t.is(siteCategoriesCount.total, 1)
  t.is(categoriesCount.total, 1)

  await deleteCategory(db, 'category1')

  const entriesCount2 = await db('Entries').count('* as total').first()
  const sitesCount2 = await db('Sites').count('* as total').first()
  const entryCategoriesCount2 = await db('EntryCategories')
    .count('* as total')
    .first()
  const siteCategoriesCount2 = await db('SiteCategories')
    .count('* as total')
    .first()
  const categoriesCount2 = await db('Categories').count('* as total').first()
  t.is(entriesCount2.total, 0)
  t.is(sitesCount2.total, 0)
  t.is(entryCategoriesCount2.total, 0)
  t.is(siteCategoriesCount2.total, 0)
  t.is(categoriesCount2.total, 0)
})

test('#insertSite', async (t) => {
  const { db, fixtures } = t.context
  const { site } = fixtures
  await insertCategory(db, 'category1')
  const siteKey = await insertSite(db, 'category1', site)
  t.is(siteKey, hash(site.title))
  const persistedSite = await db('Sites').first()
  t.deepEqual(persistedSite, {
    key: hash(site.title),
    title: site.title,
    url: site.link,
    description: site.description,
    createdAt: Math.floor(site.updatedAt / 1000)
  })

  const persistedSiteCategory = await db('SiteCategories').first()
  t.deepEqual(persistedSiteCategory, {
    category: 'category1',
    siteKey: hash(site.title),
    siteTitle: site.title
  })

  // Ignore insertion when category is not exists
  await insertSite(db, 'category2', site)
  const categoryCount = await db('SiteCategories').count('* as total').first()
  t.is(categoryCount.total, 1)
  const siteCount = await db('Sites').count('* as total').first()
  t.is(siteCount.total, 1)

  // Multiple category but same site
  await insertCategory(db, 'category2')
  const siteKey2 = await insertSite(db, 'category2', site)
  t.is(siteKey, siteKey2)
  const categoryCount2 = await db('SiteCategories').count('* as total').first()
  t.is(categoryCount2.total, 2)
  const siteCount2 = await db('Sites').count('* as total').first()
  t.is(siteCount2.total, 1)
})

test('#deleteSiteCategory', async (t) => {
  const { db, fixtures } = t.context
  const { entry, site } = fixtures
  await insertCategory(db, 'category1')
  await insertCategory(db, 'category2')
  await insertSite(db, 'category1', site)
  await insertSite(db, 'category2', site)

  const siteKey = hash(site.title)
  await insertEntry(db, siteKey, site.title, 'category1', entry)
  await insertEntry(db, siteKey, site.title, 'category2', entry)
  await deleteSiteCategory(db, 'category2', siteKey)

  const entryCount = await db('Entries').count('* as total').first()
  const siteCount = await db('Sites').count('* as total').first()
  const entryCategoryCount = await db('EntryCategories')
    .count('* as total')
    .first()
  const siteCategoryCount = await db('SiteCategories')
    .count('* as total')
    .first()

  t.is(entryCount.total, 1)
  t.is(siteCount.total, 1)
  t.is(entryCategoryCount.total, 1)
  t.is(siteCategoryCount.total, 1)

  await deleteSiteCategory(db, 'category1', siteKey)

  const siteCategoryCount2 = await db('SiteCategories')
    .count('* as total')
    .first()
  const entryCategoryCount2 = await db('EntryCategories')
    .count('* as total')
    .first()
  const siteCount2 = await db('Sites').count('* as total').first()
  const entryCount2 = await db('Entries').count('* as total').first()
  t.is(siteCategoryCount2.total, 0)
  t.is(entryCategoryCount2.total, 0)
  t.is(siteCount2.total, 0)
  t.is(entryCount2.total, 0)
})

test('#deleteSite', async (t) => {
  const { db, fixtures } = t.context
  const { entry, site } = fixtures
  await insertCategory(db, 'category1')
  await insertCategory(db, 'category2')
  await insertSite(db, 'category1', site)
  await insertSite(db, 'category2', site)

  const siteKey = hash(site.title)
  await insertEntry(db, siteKey, site.title, 'category1', entry)
  await insertEntry(db, siteKey, site.title, 'category2', entry)
  await deleteSite(db, siteKey)

  const siteCategoryCount = await db('SiteCategories')
    .count('* as total')
    .first()
  const entryCategoryCount = await db('EntryCategories')
    .count('* as total')
    .first()
  const sitesCount = await db('Sites').count('* as total').first()
  const entriesCount = await db('Entries').count('* as total').first()

  t.is(siteCategoryCount.total, 0)
  t.is(entryCategoryCount.total, 0)
  t.is(sitesCount.total, 0)
  t.is(entriesCount.total, 0)
})

test('#insertEntry single entry', async (t) => {
  const { db, fixtures } = t.context
  const { entry, site } = fixtures
  await insertCategory(db, 'category1')
  await insertEntry(db, 'nonexist', 'nonexists', 'category1', entry)
  const countResult = await db('Entries').count('* as total').first()
  t.is(countResult.total, 0)

  const siteKey = await insertSite(db, 'category1', site)
  await insertEntry(db, siteKey, site.title, 'category2', entry)
  const countResult2 = await db('Entries').count('* as total').first()
  t.is(countResult2.total, 0)

  const entryKey = await insertEntry(
    db,
    siteKey,
    site.title,
    'category1',
    entry
  )
  t.is(entryKey, hash(`${entry.title}${entry.link}`))
  const countResult3 = await db('Entries').count('* as total').first()
  t.is(countResult3.total, 1)
  const categoryResults = await db('EntryCategories')
    .count('* as total')
    .first()
  t.is(categoryResults.total, 1)
  const persistedEntry = await db('Entries').first()
  sinon.assert.match(persistedEntry, {
    key: hash(`${entry.title}${entry.link}`),
    siteKey: hash(site.title),
    siteTitle: site.title,
    url: entry.link,
    content: entry.content,
    contentTime: Math.floor(entry.date / 1000),
    createdAt: sinon.match.number
  })
})

test('#insertEntry with site in multiple categories', async (t) => {
  const { db, fixtures } = t.context
  const { entry, site } = fixtures
  await insertCategory(db, 'category1')
  await insertCategory(db, 'category2')
  await insertSite(db, 'category1', site)
  await insertSite(db, 'category2', site)
  const siteKey = hash(site.title)

  await insertEntry(db, siteKey, site.title, 'category1', entry)
  await insertEntry(db, siteKey, site.title, 'category2', entry)
  const count1 = await db('Entries').count('* as total').first()
  t.is(count1.total, 1)
  const count2 = await db('EntryCategories').count('* as total').first()
  t.is(count2.total, 2)
})

test('#insertEntry with empty date', async (t) => {
  const { db, fixtures } = t.context
  const { entryWithoutDate, site } = fixtures
  await insertCategory(db, 'category1')
  await insertSite(db, 'category1', site)
  const siteKey = hash(site.title)

  await insertEntry(db, siteKey, site.title, 'category1', entryWithoutDate)

  const entriesCount = await db('Entries').count('* as total').first()
  const entryCategoryCount = await db('EntryCategories')
    .count('* as total')
    .first()

  t.is(entriesCount.total, 1)
  t.is(entryCategoryCount.total, 1)

  const entry = await db('Entries').first()
  const entryCategory = await db('EntryCategories').first()
  t.is(
    entryCategory.entryContentTime,
    entry.createdAt,
    'entryContentTime should use entry createdAt when contentTime is null'
  )
  t.is(
    entry.contentTime,
    entry.createdAt,
    'Content time in the entry should be the same as createdAt'
  )
})

test('#deleteEntry', async (t) => {
  const { db, fixtures } = t.context
  const { entry, site } = fixtures

  await insertCategory(db, 'category1')
  const siteKey = await insertSite(db, 'category1', site)
  const key = await insertEntry(db, siteKey, site.title, 'category1', entry)

  await deleteEntry(db, key)
  const entryCount = await db('Entries').count('* as total').first()
  t.is(entryCount.total, 0)

  const entryCategoryCount = await db('EntryCategories')
    .count('* as total')
    .first()
  t.is(entryCategoryCount.total, 0)
})
