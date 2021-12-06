import { GetStaticPropsContext } from 'next'
import * as core from '@actions/core'
import React from 'react'

import { getGithubConfigs, GithubConfigs } from '../lib/config'
import Application from '../lib/components/Application'
import Meta from '../lib/components/Meta'

export async function getStaticProps(context: GetStaticPropsContext) {
  const githubConfigs = getGithubConfigs({
    githubRootName: process.env['GITHUB_REPOSITORY'] || '',
    customDomain: core.getInput('customDomain')
  })
  return {
    props: {
      githubConfigs
    }
  }
}

interface Props {
  githubConfigs: GithubConfigs
}
export default function Home({ githubConfigs }: Props) {
  return (
    <>
      <Meta />
      <Application githubConfigs={githubConfigs} />
    </>
  )
}
