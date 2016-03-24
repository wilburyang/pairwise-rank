var assert = require('assert');

var pr = {};

(function() {
    /**
     * Constructor for a PairwiseRankTopo object.
     * Builds an in-memory ranking backed by a topological sort (Kahn's algorithm).
     * Nodes are integers in the range from 0 to size - 1.
     */
    pr.PairwiseRankTopo = function() {

        /**
         * Number of nodes in this ranking.
         */
        this.size = 0;

        /**
         * Dictionary of directed edges from node index to a list of
         * its neighbors' indices.
         */
        this.edges = {};

        this._startNodes = new Set(); // nodes without incoming edges
        this._cycleStart = -1;
        this._cycleStartNodes = []; // start here if there are no nodes without incoming edges
        this._modified = true; // check for caching ranking
        this._cachedRanking = []; // cached ranking
        this._queriesMade = new Set(); // queries made
    };
    
    var prt = pr.PairwiseRankTopo;

    /**
     * Adds one new node to the ranking.
     */
    prt.prototype.addNodeTopo = function() {
        this._startNodes.add(this.size);
        this.size++;
        this._modified = true;
    };
    
    function findCycleNodes(prt, node) {
        var cycleNodes = new Set();
        var seen = new Set();
        var go = function(prt, node, start, depth) {
            if (depth > 0 && node === start) {
                return true;
            }
            if (seen.has(node) && node !== start) {
                return false;
            }
            seen.add(node);
            var isCycleNode = false;
            if (prt.edges[node]) {
                prt.edges[node].forEach(function(to) {
                    isCycleNode = isCycleNode || go(prt, to, start, depth + 1);
                });
            }
            if (isCycleNode) {
                cycleNodes.add(node);
            }
        };
        go(prt, node, node, 0);
        console.log(Array.from(cycleNodes));
        return Array.from(cycleNodes);
    }

    /**
     * Registers the comparison a > b. This is represented by a directed
     * edge going from a > b.
     *
     * @param a the larger node
     * @param b the smaller node
     */
    prt.prototype.addEdgeTopo = function(a, b) {
        assert(a < this.size, 'Node ' + a + ' is out of bounds.');
        assert(b < this.size, 'Node ' + b + ' is out of bounds.');
    
        if (!this.edges[a]) {
            this.edges[a] = [];
        }
        this.edges[a].push(b);
        
        // if about to form a cycle
        if (this._startNodes.size === 1 && this._startNodes.has(b)) {
            this._cycleStart = b;
            this._cycleStartNodes = findCycleNodes(this, b);
        }
        this._startNodes.delete(b);
        this._modified = true;
        this._queriesMade.add('f' + a + 't' + b);
    };

    /**
     * Returns a ranking structured as [[node1, node2, node3], [node4], ...]
     * where node1, node2, and node3 are the indices of the highest ranking nodes
     * (there may be ties).
     *
     * @return {Array}
     */
    prt.prototype.getRankingTopo = function() {
        if (!this._modified) {
            return this._cachedRanking;
        }
        var seen = new Set();
        var ranking = [];

        var startNodes;        
        if (this._startNodes.size > 0) {
            startNodes = Array.from(this._startNodes);
        } else {
            startNodes = this._cycleStartNodes.splice();
            console.log(startNodes);
        }
        
        var nodes = startNodes.map(function(node) {
            return {
                node: node,
                depth: 0
            };
        });

        // basically Kahn's algorithm for topological sort (but without removing edges)
        while (nodes.length > 0) {
            var node = nodes.shift();
            if (seen.has(node.node)) { continue; }
            seen.add(node.node);
            if (!ranking[node.depth]) {
                ranking[node.depth] = [];
            }
            ranking[node.depth].push(node.node);
            if (this.edges[node.node]) {
                this.edges[node.node].forEach(function(to) {
                    if (seen.has(to)) { return; }
                    nodes.push({
                        node: to,
                        depth: node.depth + 1
                    });
                });
            }
        }
        
        this._modified = false;
        this._cachedRanking = ranking;
        return ranking;
    };
    
    function hasMadeQuery(prt, from, to) {
        return prt._queriesMade.has('f' + from + 't' + to) ||
                prt._queriesMade.has('f' + to + 'f' + from);
    }
    
    /**
     * Returns the next pairwise comparison query
     *
     * @return {Object}
     */
    prt.prototype.getQueryTopo = function() {
        var ranking = this.getRankingTopo();
        if (ranking.length <= 0) { return null; }
        if (ranking[0].length >= 2) {
            for (var i = 0; i < ranking[0].length; i++) {
                var from = ranking[0][i];
                for (var j = i + 1; j < ranking[0].length; j++) {
                    var to = ranking[0][j];
                    if (!hasMadeQuery(this, from, to)) {
                        return {
                            from: from,
                            to: to
                        };
                    }
                }
            }
        }
        for (var i = 1; i < ranking.length; i++) {
            for (var j = 0; j < ranking[0].length; j++) {
                var from = ranking[0][j];
                for (var k = 0; k < ranking[i].length; k++) {
                    var to = ranking[i][k];
                    if (!hasMadeQuery(this, from, to)) {
                        return {
                            from: from,
                            to: to
                        };
                    }
                }
            }
        }
        return null;
    };
})();

// test
var prt = new pr.PairwiseRankTopo();
for (var i = 0; i < 6; i++) {
    prt.addNodeTopo();
}
prt.addEdgeTopo(0, 1);
prt.addEdgeTopo(0, 2);
prt.addEdgeTopo(3, 0);
prt.addEdgeTopo(3, 4);
prt.addEdgeTopo(3, 5);
prt.addEdgeTopo(1, 3);
console.log(prt.getRankingTopo());
console.log(prt.getQueryTopo());

//module.exports = pr;