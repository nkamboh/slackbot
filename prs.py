from subprocess import *
from json import *

import re

COMMAND="curl -s"
HEAD_PARAM="-I"
AUTHORIZATION_HEADER="-u github_username:f0290da65ff275840f1bffac4045d42083e377d9"
API_BASE="https://api.github.com/repos"
ORG_REPO="AppDirect/AppDirect"
PAGE="page"
MAX_PAGES=1

def is_pr_applicable_to_domain(url, domain_files_list):
	command = "{} {} {}/files | jq '[.[] | .filename]'".format(COMMAND, AUTHORIZATION_HEADER, url);
	output=check_output(command, shell=True)
	file_list = loads(output)
	file_list.extend(["/".join(l.split('/')[:-1]) for l in loads(output)])
	return any([u.endswith(end) for end in domain_files_list for u in file_list])

def fetch_pr_list_link():
	command = "{} {} {} {}/{}/pulls | egrep '^Link'".format(COMMAND, HEAD_PARAM, AUTHORIZATION_HEADER, API_BASE, ORG_REPO);
	output=check_output(command, shell=True)
	link = re.search("(?P<url>https?://[^\?]+)", str(output)).group("url")
	return link

def fetch_prs(link):
	jq_command = "jq '[.[] | {pr_url: .url, pr_title: .title, pr_created_at: .created_at}]'"
	list=[]
	for i in range(MAX_PAGES):
		command = "{} {} {}?{}={} | {}".format(COMMAND, AUTHORIZATION_HEADER, link, PAGE, i, jq_command);
		output=check_output(command, shell=True)
		list.extend(loads(output))
	return list

def fetch_files_list(path):
	with open(path) as f:
		content = f.readlines()
	content = list(filter(None, [x.strip() for x in content]))
	return content

link = fetch_pr_list_link()
prs = fetch_prs(link)
#print(prs[-1:])
ends = fetch_files_list('/tmp/order.txt')
ends = ['AppOrderFormPanel.java']
#print(ends)
for pr in prs:
	is_it = is_pr_applicable_to_domain(pr['pr_url'], ends)
	if is_it:
		print(pr)