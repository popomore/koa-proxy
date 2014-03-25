test:
	node --harmony ./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha -- -R spec -t 20000

coveralls: test
	cat ./coverage/lcov.info | ./node_modules/.bin/coveralls

.PHONY: test
