import Vue from 'https://cdn.jsdelivr.net/npm/vue@2.5.13/dist/vue.esm.browser.js'

import { deparam } from './deparam.js'

const socket = io()

socket.on('connect', () => {
  const params = deparam(window.location.search)
  params.name = document.getElementById('name_user').value;
  params.room = document.getElementById('room_user').value;
  // console.log(params);
  
  socket.emit('join', params, err => {
    if (err) {
      alert(err)
      window.location.href = '/'
    }
  })
})


socket.on('disconnect', () => {
  console.log('Disconnected from Server')
})

Vue.component('message-template', {
  props: ['msg'],
  filters: {
    formatTime(str) {
      return dateFns.format(str, 'HH:mm a')
    },
  },
  template: `        <li class="message">
        <div class="message__title">
           <h4> {{ msg.from }}</h4>
          <span>
            {{ msg.createAt | formatTime }}
          </span>
          </div>
          <div class="message__body">
          <p v-if="msg.text"> {{ msg.text }}</p>
          <p v-else>  <a :href="msg.url" target="_blank">My location</a></p>
          </div>

        </li>`,
})

new Vue({
  el: '#app',
  data: {
    message: '',
    messages: [],
    isButtonDisabled: false,
    users: [],
    peer: null,
  },
  methods: {
    sendMessage() {
      //const params = deparam(window.location.search)
      socket.emit('createMessage', { text: this.message }, () => {
        this.message = ''
      })
    },
  },

  created() {
    socket.on('newMessage', msg => {
      this.messages.push(msg)
    })
    
    socket.on('updateUserList', users => {
      this.users = users
    })
  },
})
