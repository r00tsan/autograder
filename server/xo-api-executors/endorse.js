'use strict';

const Request = require('request');
const api = require('./xo-api-urls');
const Helper = require('../helper/helper');

const DEFAULT_ENGLISH_SCORE = 0;

let requestQueue = [];
let headers;
let CONFIG;
let helper;
let isAborted;

module.exports = {
  run: function (config) {
    isAborted = false;
    CONFIG = config;
    helper = new Helper(CONFIG.ws, CONFIG.username, CONFIG.password);
    headers = helper.getHeaders(true);

    CONFIG.appIdList = helper.appIdsToArray(config.appIdList);

    helper.setStatus('process');
    endorseCandidates();
  },
  abort: (ws) => {
    isAborted = true;
    if (!helper) {
      helper = new Helper(ws);
    }
    if (!requestQueue.length) {
      helper.setStatus('pending');
      return helper.sendMessage(`There is nothing to terminate`);
    }

    helper.sendMessage(`Threads in queue: ${requestQueue.length}\nTrying to abort...`);
    requestQueue.forEach(el => {
      try {
        el.abort();
        helper.sendMessage(`Thread ${requestQueue.indexOf(el)} was terminated`);
        removeQueueElement(el);
        if (!requestQueue.length) {
          helper.sendMessage(`All threads terminated!`);
          helper.setStatus('pending');
        }
      } catch (e) {
        helper.sendMessage(e + '');
        helper.setStatus('pending');
      }
    });
  }
};

function removeQueueElement(request) {
  requestQueue.splice(requestQueue.indexOf(request), 1);
}

function endorseCandidates() {
  let counter = 0;
  CONFIG.appIdList.forEach(element => {
    let id = element.id ? element.id : element;
    let request = Request.post({
      url: api.endorse(id),
      headers: helper.getHeaders(false)
    }, (err, response) => {
      removeQueueElement(request);
      if ( helper.errorHandler(response.statusCode, id) !== 200 ) {
        return;
      }

      helper.sendMessage(`Candidate with Application ID ${id} successfully endorsed`);
      if (isAborted) {
        helper.sendMessage(`Endorsing was stopped by user`);
        return helper.setStatus('pending');
      }
      counter++;
      if (counter === CONFIG.appIdList.length) {
        fillPreHireForm();
      }
    });
    requestQueue.push(request);
  });
}

function fillPreHireForm() {
  let counter = 0;
  CONFIG.appIdList.forEach(element => {
    let id = element.id ? element.id : element;
    let englishScore = element.score && element.score !== id ? element.score : DEFAULT_ENGLISH_SCORE;
    let request = Request.put({
      url: api.preHireFormCall(id),
      headers: headers,
      json: api.payloads.preHireFormCall(englishScore)
    }, (err, response) => {
      removeQueueElement(request);
      if ( helper.errorHandler(response.statusCode, id) !== 200 ) {
        return;
      }

      helper.sendMessage(`Pre Hire Form filled for candidate with Application ID ${id} with English score ${englishScore}`);
      if (isAborted) {
        helper.sendMessage(`Filling Pre Hire form was stopped by user`);
        return helper.setStatus('pending');
      }
      counter++;
      if (counter === CONFIG.appIdList.length) {
        helper.sendMessage(`Starting approval of candidates`);
        acceptCandidates();
      }
    });
    requestQueue.push(request);
  });
}

function acceptCandidates(counter) {
  setTimeout(function () {
    counter = counter ? counter : 0;

    if (counter === CONFIG.appIdList.length) {
      helper.sendMessage(`All candidates were moved to Marketplace, grab a beer!`);
      helper.setStatus('pending');
      return;
    }

    let id = CONFIG.appIdList[counter].id;

    let request = Request.post({
      url: api.accept(id),
      headers: helper.getHeaders(false),
      body: JSON.stringify(api.payloads.accept(id))
    }, (err, response) => {
      removeQueueElement(request);
      if ( helper.errorHandler(response.statusCode, id) !== 200 ) {
        helper.sendMessage(`Something wrong happens with candidate ${id}, please send report below to developer`);
        helper.sendMessage(response);
      } else {
        helper.sendMessage(`Candidate with Application ID ${id} successfully accepted`);
      }

      if (isAborted) {
        helper.sendMessage(`Accepting was stopped by user`);
        return helper.setStatus('pending');
      }
      if (counter !== CONFIG.appIdList.length) {
        acceptCandidates(++counter);
      }
    });
    requestQueue.push(request);
  });

  // CONFIG.appIdList.forEach(element => {
  //   let id = element.id ? element.id : element;
  //
  //   let request = Request.post({
  //     url: api.accept(id),
  //     headers: helper.getHeaders(false),
  //     body: JSON.stringify(api.payloads.accept(id))
  //   }, (err, response) => {
  //     removeQueueElement(request);
  //     if ( helper.errorHandler(response.statusCode, id) !== 200 ) {
  //       helper.sendMessage(response);
  //       helper.sendMessage(err);
  //       return;
  //     }
  //
  //     helper.sendMessage(`Candidate with Application ID ${id} successfully accepted`);
  //     if (isAborted) {
  //       helper.sendMessage(`Accepting was stopped by user`);
  //       return helper.setStatus('pending');
  //     }
  //     counter++;
  //     if (counter === CONFIG.appIdList.length) {
  //       helper.sendMessage(`All candidates were moved to Marketplace, grab a beer!`);
  //       helper.setStatus('pending');
  //     }
  //   });
  //   requestQueue.push(request);
  // });
}
