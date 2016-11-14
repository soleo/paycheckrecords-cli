require('datejs');
const config    = require('./config');
const chalk     = require('chalk');
const Nightmare = require('nightmare');
const prompt    = require('prompt');

var nightmare = Nightmare({
	executionTimeout: 5000,
	show: true
});

function downloadPayStub(nightmare, startdate) {
	// Bug from paycheckrecords.com
	// If start date is any date in 02/01/2014 - 02/28/2014, the result will be empty
	// Fix: Offset a month for start date
	var start = Date.parse(startdate),
		end   = startdate;
	if(start.getMonth() != 1) {
		start = (start.getMonth() + 1) + '/' + start.getDate() + '/' + start.getFullYear();
	}else{
		start = (start.getMonth() ) + '/' + start.getDate() + '/' + start.getFullYear();
	}

	nightmare
		.evaluate(function() {
			document.querySelector('input#startDate').value = ''
			document.querySelector('input#endDate').value = ''
		})
		.type('#startDate', start)
		.type('#endDate', end)
		.click('#updateReportSubmit')
		.wait(1000) // Wait for ajax to submit
		.wait('.report')
		.click('.report .tableCell a')
		.wait('#paystub_form_tbl')
		.pdf('PayCheck-'+startdate.replace(/\//g, '-') +'.pdf')
		.back()
}

function searchPaychecks(params) {

	var startdate = Date.parse(params.startdate),
		startdate = (startdate.getMonth() + 1) + '/' + startdate.getDate() + '/' + startdate.getFullYear(),
		enddate = Date.parse(params.enddate),
		enddate = (enddate.getMonth() + 1) + '/' + enddate.getDate() + '/' + enddate.getFullYear();

	console.log(chalk.blue('Seaching Date Range: '+startdate+' ~ '+enddate));

	nightmare
		.goto('https://www.paycheckrecords.com/login.jsp')
		.wait('#ius-userid')
		.evaluate(function() {
			document.querySelector('input#ius-userid').value = ''
		})
		.type('#ius-userid', config.username)
		.type('#ius-password', config.password)
		.click('#ius-sign-in-submit-btn')
		.wait('#startDate')
		.evaluate(function() {
			document.querySelector('input#startDate').value = ''
			document.querySelector('input#endDate').value = ''
		})
		.type('#startDate', startdate)
		.type('#endDate', enddate)
		.click('#updateReportSubmit')
		.wait(1000) // Wait for ajax to submit
		.wait('.report')
		.evaluate(function () {
			var links = document.querySelectorAll('.report a'), i;
			var pages = [];

			for (i = 0; i < links.length; ++i) {
			  pages.push({
				'link': links[i].href,
				'name': links[i].innerText
			  });
			}
			return pages;
		})
		.end()
		.then(function (pages) {
			var downloader = Nightmare({
				executionTimeout: 5000,
				show: true
			});
			downloader
				.goto('https://www.paycheckrecords.com/login.jsp')
				.wait('#ius-userid')
				.evaluate(function() {
					document.querySelector('input#ius-userid').value = ''
				})
				.type('#ius-userid', config.username)
				.type('#ius-password', config.password)
				.click('#ius-sign-in-submit-btn')
				.wait('#startDate');

			for (i = 0; i < pages.length; ++i) {
				console.log(chalk.green('Downloading PayStub on '+pages[i].name));
				downloadPayStub(downloader, pages[i].name);
			}

			downloader
				.end()
				.catch(function (error) {
					console.error('Search failed:', error);
				});
			})
			.catch(function (error) {
				console.error('Search failed:', error);
			});

}

if (process.stdout.isTTY) {
	/* Prompt user for input */
	var schema = {
		properties: {
			startdate: {
				description: 'Start Date',
				default: config.defaults.startdate
			},
			enddate: {
				description: 'End Date',
				default: config.defaults.enddate
			}
		}
	};

	prompt.start().get(schema, function (err, result) {
		if (err) throw err;

		searchPaychecks(result);
	});
}
