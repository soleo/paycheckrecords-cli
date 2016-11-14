require('datejs');
const config    = require('./config');
const chalk     = require('chalk');
const Nightmare = require('nightmare');
const prompt    = require('prompt');

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleepFor( sleepDuration ){
	var now = new Date().getTime();
	while(new Date().getTime() < now + sleepDuration){ /* do nothing */ } 
}

function downloadPayStub(startdate, enddate) {
	sleepFor(getRandomInt(1000, 3000))

	var downloader = Nightmare( {show: false} )
	downloader
		.goto('https://www.paycheckrecords.com/login.jsp')
		.wait(getRandomInt(1000, 2000))
		.wait('#ius-userid')
		.type('#ius-userid', config.username)
		.type('#ius-password', config.password)
		.click('#ius-sign-in-submit-btn')
		.wait('#startDate')
		.evaluate(function() {
			document.querySelector('input#startDate').value = ''
			document.querySelector('input#endDate').value = ''
		})
		.type('#startDate', startdate)
		.type('#endDate', startdate)
		.click('#updateReportSubmit')
		.wait(1000) // Wait for ajax to submit
		.wait('.report')
		.click('.report .tableCell a')
		.wait('#paystub_form_tbl')
		.pdf('PayCheck-'+startdate.replace(/\//g, '-') +'.pdf')
		.evaluate(function () {
		})
		.end()
		.then(function (result) {
			//console.log(result)
		})
		.catch(function (error) {
			console.error('Search failed:', error);
		});
		
}

function searchPaychecks(params) {

	var startdate = Date.parse(params.startdate),
		startdate = (startdate.getMonth() + 1) + '/' + startdate.getDate() + '/' + startdate.getFullYear(),
		enddate = Date.parse(params.enddate),
		enddate = (enddate.getMonth() + 1) + '/' + enddate.getDate() + '/' + enddate.getFullYear();
	
	console.log(chalk.blue('Seaching Date Range: '+startdate+' ~ '+enddate));
	
	var nightmare =  Nightmare( {show: false} )
	nightmare
		.goto('https://www.paycheckrecords.com/login.jsp')
		.wait('#ius-userid')
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
			console.log(pages)
			for (i = 0; i < pages.length; ++i) {
				downloadPayStub(pages[i].name, enddate);

			}
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
