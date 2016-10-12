FROM node:5

RUN apt-get install git
ADD . /inspiration-ci
WORKDIR /inspiration-ci
RUN npm install -g sails && \
    npm install
EXPOSE 1337

CMD ["sails", "lift"]
